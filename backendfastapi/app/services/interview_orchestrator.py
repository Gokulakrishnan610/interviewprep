"""
InterviewOrchestrator — all business logic for the realtime interview loop.

The WebSocket conductor (interview_ws.py) is kept thin:
  it handles IO (receive/send) and delegates every decision to this class.

Responsibilities
────────────────
  on_answer(text)         persist turn, advance state, generate + push next question
  on_audio_chunk(...)     accumulate in Redis buffer; flush+transcribe when final
  on_end_session()        mark session completed, trigger async feedback generation
  _generate_question()    call GeminiClient with full context
  _transcribe_buffer()    call DeepgramClient on accumulated audio chunks
  _schedule_feedback()    fire-and-forget background task: Gemini → FeedbackReport
"""
from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.deepgram_client import DeepgramClient
from app.integrations.gemini_client import GeminiClient
from app.repositories.session_repository import SessionRepository
from app.tasks.report_tasks import schedule_report
from app.websocket.connection_manager import ConnectionManager
from app.websocket.schemas import (
    msg_error,
    msg_question,
    msg_session_ended,
    msg_thinking,
    msg_transcript_final,
    msg_transcript_partial,
    msg_turn_saved,
)
from app.websocket.session_state import (
    MAX_AUDIO_BUFFER_CHUNKS,
    InterviewState,
    append_audio_chunk,
    audio_buffer_length,
    clear_state,
    flush_audio_buffer,
    save_state,
)

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InterviewOrchestrator:
    """
    Stateless per-request service; receives shared infrastructure as constructor args.
    One instance is created per WebSocket connection by the conductor.
    """

    def __init__(
        self,
        *,
        session_id: int,
        room_template,               # InterviewRoomTemplate ORM object
        state: InterviewState,
        repo: SessionRepository,
        redis: Redis,
        manager: ConnectionManager,
        db: AsyncSession,
    ) -> None:
        self._session_id = session_id
        self._room = room_template
        self._state = state
        self._repo = repo
        self._redis = redis
        self._manager = manager
        self._db = db

    # ── Public API (called by conductor) ─────────────────────────────────────

    async def on_answer(self, answer_text: str) -> None:
        """
        Handle a plain-text answer:
          1. Persist answer to the current turn.
          2. Advance turn counter in Redis.
          3. If more turns remain: generate + push next question.
          4. If last turn: mark state as ending (conductor will call on_end_session).
        """
        text = answer_text.strip()
        if not text:
            await self._send(msg_error("Answer text cannot be empty."))
            return

        current_turn = self._state.turn_number

        # Persist answer
        turn = await self._repo.get_turn(self._session_id, current_turn)
        if turn is not None:
            await self._repo.update_turn_answer(
                turn,
                answer_text=text,
                answered_at=_utcnow(),
            )
            await self._repo.commit()

        await self._send(msg_turn_saved(current_turn))

        # Advance state
        self._state.turn_number += 1
        await save_state(self._redis, self._state)

        if self._state.turn_number >= self._state.total_turns:
            self._state.status = "ending"
            await save_state(self._redis, self._state)
            return  # conductor detects ending and calls on_end_session

        await self._push_next_question()

    async def on_audio_chunk(
        self,
        b64_chunk: str,
        mime_type: str,
        chunk_final: bool,
    ) -> None:
        """
        Accumulate audio chunks in Redis.  When chunk_final=True (or buffer is
        full), flush to Deepgram and treat the transcript as a text answer.
        """
        await append_audio_chunk(self._redis, self._session_id, b64_chunk)
        buf_len = await audio_buffer_length(self._redis, self._session_id)

        force_flush = buf_len >= MAX_AUDIO_BUFFER_CHUNKS

        if chunk_final or force_flush:
            if force_flush and not chunk_final:
                logger.warning(
                    "Audio buffer overflow for session %s (%d chunks) — force flush",
                    self._session_id, buf_len,
                )
            await self._flush_and_transcribe(mime_type)

    async def on_end_session(self) -> None:
        """
        Mark the DB session as completed, clean Redis state, and
        kick off report generation via the shared task (fire-and-forget).
        """
        session = await self._repo.get_by_id(self._session_id)
        if session and session.status == "in_progress":
            await self._repo.complete(session, ended_at=_utcnow())
            await self._repo.commit()
            logger.info("Session %s marked completed by orchestrator", self._session_id)

        await clear_state(self._redis, self._session_id)

        # Delegate to the shared report task — not a private method anymore
        schedule_report(self._session_id)
        logger.info("Report task scheduled for session %s by orchestrator", self._session_id)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _push_next_question(self) -> None:
        """
        Generate the next question via Gemini and push it to the client.
        Sends a `thinking` message first so the client can show a spinner.
        """
        await self._send(msg_thinking())

        prior_turns = await self._build_prior_turns_context()
        question_text = await self._generate_question(
            self._state.turn_number, prior_turns
        )

        await self._send(
            msg_question(
                turn_number=self._state.turn_number,
                question_text=question_text,
                total_turns=self._state.total_turns,
            )
        )

        # Persist immediately so a disconnect doesn't lose the question
        await self._repo.create_turn(
            session_id=self._session_id,
            turn_number=self._state.turn_number,
            question_text=question_text,
            asked_at=_utcnow(),
        )
        await self._repo.commit()

    async def _generate_question(
        self, turn_number: int, prior_turns: list[dict]
    ) -> str:
        client = GeminiClient()
        result = await client.generate_question(
            turn_number=turn_number,
            room_title=self._room.title,
            interviewer_name=self._room.interviewer_name or "Alex",
            interviewer_persona=self._room.interviewer_persona or "",
            round_type=self._room.round_type,
            competencies=self._room.competencies or [],
            prior_turns=prior_turns,
        )
        return result.question_text

    async def _build_prior_turns_context(self) -> list[dict]:
        turns = await self._repo.get_turns_for_session(self._session_id)
        return [
            {
                "turn": t.turn_number,
                "question": t.question_text,
                "answer": t.answer_text,
            }
            for t in turns
            if t.answer_text  # only answered turns provide useful context
        ]

    async def _flush_and_transcribe(self, mime_type: str) -> None:
        """
        Pull all chunks from Redis, concatenate, send to Deepgram.
        On success, routes transcript through on_answer().
        On failure, sends an error and leaves the turn unanswered.
        """
        chunks = await flush_audio_buffer(self._redis, self._session_id)
        if not chunks:
            logger.debug("Audio buffer empty on flush for session %s", self._session_id)
            return

        # Concatenate base64 chunks → single bytes blob
        try:
            audio_bytes = b"".join(
                base64.b64decode(chunk) for chunk in chunks
            )
        except Exception as exc:
            logger.error("Failed to decode audio chunks for session %s: %s", self._session_id, exc)
            await self._send(msg_error("Audio decoding failed. Please try again."))
            return

        deepgram = DeepgramClient()
        if not deepgram.is_configured():
            await self._send(
                msg_error(
                    "Audio transcription is not configured. "
                    "Please submit your answer as text.",
                )
            )
            return

        result = await deepgram.transcribe_bytes(audio_bytes, mime_type=mime_type)

        if not result.transcript.strip():
            await self._send(
                msg_error("No speech detected. Please speak clearly and try again.")
            )
            return

        # Echo the final transcript to the client before saving
        await self._send(
            msg_transcript_final(result.transcript, confidence=result.confidence)
        )

        # Route through the normal text-answer path
        await self.on_answer(result.transcript)

    # ── Utility ───────────────────────────────────────────────────────────────

    async def _send(self, msg: dict) -> None:
        await self._manager.send_json(self._session_id, msg)

    @staticmethod
    def total_turns_for_template(room_template) -> int:
        """
        Canonical turn count calculation: len(competencies) + 1 (intro).
        Clamped to [2, 10].
        """
        n = len(room_template.competencies or []) + 1
        return max(2, min(n, 10))
