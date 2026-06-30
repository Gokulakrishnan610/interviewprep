"""
WebSocket interview conductor.

Endpoint: WS /ws/interview/{session_id}?token=<access_jwt>

Full flow per connection
────────────────────────
1. Authenticate user from ?token= query param (JWT).
2. Load the InterviewSession from Postgres — assert in_progress + owned by user.
3. Load/restore interview state from Redis (reconnect-safe).
4. Push "connected" message with current progress.
5. If turn_number == 0 (fresh start), push the first question immediately.
6. Enter the receive loop:
     answer        → persist turn to DB, advance state, push next question
                     (or push session_ended when all turns are done)
     audio_answer  → scaffold stub, Phase 5 will invoke Deepgram STT here
     ping          → push pong
     end_session   → mark session complete, push session_ended, exit loop
7. On disconnect / error: persist partial state to Redis before exiting.

Question generation (Phase 5 placeholder)
──────────────────────────────────────────
`_get_question()` returns a canned question for now.
Phase 5 will replace this with a Gemini call using the room_template's
interviewer_persona + competencies + prior turns as context.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.redis import get_redis_pool
from app.websocket.connection_manager import manager
from app.websocket.schemas import (
    InboundAnswer,
    InboundAudioAnswer,
    InboundEndSession,
    InboundPing,
    msg_connected,
    msg_error,
    msg_pong,
    msg_question,
    msg_session_ended,
    msg_turn_saved,
    parse_inbound,
)
from app.websocket.session_state import (
    InterviewState,
    clear_state,
    init_state,
    load_state,
    save_state,
)
from app.websocket.ws_auth import (
    WS_CLOSE_FORBIDDEN,
    WS_CLOSE_NOT_FOUND,
    get_ws_user,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])

# ── Helpers ───────────────────────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_question(
    turn_number: int,
    room_template,
    prior_turns: list,
) -> str:
    """
    Return the question text for the given turn.

    Phase 4: Returns a scaffold placeholder based on turn index and
    the room_template's competencies list.
    Phase 5: Replace with async Gemini call — full context injection.
    """
    competencies: list[str] = room_template.competencies or []
    persona_name: str = room_template.interviewer_name or "Alex"

    if turn_number == 0:
        return (
            f"Hi, I'm {persona_name}. "
            f"Welcome to your {room_template.title} interview. "
            "Could you start by briefly introducing yourself and your background?"
        )

    # Map turn_number → competency (cycle through available ones)
    if competencies:
        competency = competencies[(turn_number - 1) % len(competencies)]
        return (
            f"Thank you. Now I'd like to explore your experience with "
            f"**{competency.replace('_', ' ')}**. "
            "Could you walk me through a specific example where this was important?"
        )

    # Fallback for rooms with no competencies configured
    return (
        f"Tell me about a challenging situation you faced in your work and "
        f"how you handled it. (Question {turn_number + 1})"
    )


def _total_turns_for_template(room_template) -> int:
    """
    Determine total number of turns from room_template.
    Uses len(competencies) + 1 (intro), capped to a sensible range.
    Phase 5: may be driven by Gemini conversation plan instead.
    """
    n = len(room_template.competencies or []) + 1  # +1 for intro
    return max(2, min(n, 10))  # floor=2, ceiling=10


# ── WebSocket endpoint ────────────────────────────────────────────────────────


@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: int) -> None:
    """
    Main WebSocket endpoint for the realtime interview conductor.
    Uses its own DB session (not the request-scoped get_db dependency,
    which doesn't apply to WebSocket connections).
    """
    async with AsyncSessionLocal() as db:
        await _conduct_interview(websocket, session_id, db)


# ── Conductor ─────────────────────────────────────────────────────────────────


async def _conduct_interview(
    websocket: WebSocket, session_id: int, db: AsyncSession
) -> None:
    redis = get_redis_pool()

    # ── Step 1: Authenticate ──────────────────────────────────────────────────
    user = await get_ws_user(websocket, db)
    if user is None:
        return  # ws_auth already closed the socket

    # ── Step 2: Load & validate session ──────────────────────────────────────
    from app.repositories.session_repository import SessionRepository

    repo = SessionRepository(db)
    session = await repo.get_user_session(session_id, user.id)

    if session is None:
        await _accept_and_close(
            websocket, WS_CLOSE_NOT_FOUND, "Session not found."
        )
        return

    if session.status != "in_progress":
        await _accept_and_close(
            websocket,
            WS_CLOSE_FORBIDDEN,
            f'Session is not in_progress (current status: "{session.status}").',
        )
        return

    room_template = session.room_template
    total_turns = _total_turns_for_template(room_template)

    # ── Step 3: Connect & restore state ──────────────────────────────────────
    await manager.connect(session_id, websocket)

    state: InterviewState = await load_state(redis, session_id) or await init_state(
        redis, session_id, total_turns=total_turns
    )

    # Sync total_turns in case template changed (unlikely, but safe)
    state.total_turns = total_turns

    # ── Step 4: Send "connected" ──────────────────────────────────────────────
    await manager.send_json(
        session_id,
        msg_connected(
            session_id=session_id,
            turn_number=state.turn_number,
            total_turns=state.total_turns,
        ),
    )

    # ── Step 5: Push first question if fresh start ────────────────────────────
    if state.turn_number == 0:
        question_text = _get_question(0, room_template, [])
        await manager.send_json(
            session_id,
            msg_question(
                turn_number=0,
                question_text=question_text,
                total_turns=state.total_turns,
            ),
        )
        # Persist this turn to DB immediately (so it survives a disconnect)
        await repo.create_turn(
            session_id=session_id,
            turn_number=0,
            question_text=question_text,
            asked_at=_utcnow(),
        )
        await repo.commit()

    # ── Step 6: Receive loop ──────────────────────────────────────────────────
    try:
        while True:
            try:
                raw = await websocket.receive_json()
            except ValueError:
                await manager.send_json(session_id, msg_error("Invalid JSON."))
                continue

            msg = parse_inbound(raw)
            if msg is None:
                await manager.send_json(
                    session_id,
                    msg_error(f"Unknown message type: {raw.get('type')}"),
                )
                continue

            # ── ping ──────────────────────────────────────────────────────────
            if isinstance(msg, InboundPing):
                await manager.send_json(session_id, msg_pong())
                continue

            # ── end_session ───────────────────────────────────────────────────
            if isinstance(msg, InboundEndSession):
                await _handle_end_session(
                    session_id=session_id,
                    state=state,
                    repo=repo,
                    redis=redis,
                    db=db,
                )
                await manager.send_json(session_id, msg_session_ended(session_id))
                break

            # ── audio_answer (Phase 5 stub) ───────────────────────────────────
            if isinstance(msg, InboundAudioAnswer):
                await manager.send_json(
                    session_id,
                    msg_error(
                        "Audio transcription not yet available. "
                        "Please submit your answer as text using type='answer'."
                    ),
                )
                continue

            # ── answer ────────────────────────────────────────────────────────
            if isinstance(msg, InboundAnswer):
                await _handle_answer(
                    websocket=websocket,
                    session_id=session_id,
                    state=state,
                    answer_text=msg.text,
                    room_template=room_template,
                    repo=repo,
                    redis=redis,
                    db=db,
                )

                # All turns answered → end automatically
                if state.status == "ending":
                    await _handle_end_session(
                        session_id=session_id,
                        state=state,
                        repo=repo,
                        redis=redis,
                        db=db,
                    )
                    await manager.send_json(session_id, msg_session_ended(session_id))
                    break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected mid-session: session=%s", session_id)
        # Persist partial state so reconnect resumes from the right turn
        await save_state(redis, state)
    except Exception as exc:
        logger.exception("Unexpected error in WS conductor for session %s: %s", session_id, exc)
        try:
            await manager.send_json(session_id, msg_error("An internal error occurred."))
        except Exception:
            pass
        await save_state(redis, state)
    finally:
        manager.disconnect(session_id)


# ── Action handlers ───────────────────────────────────────────────────────────


async def _handle_answer(
    *,
    websocket: WebSocket,
    session_id: int,
    state: InterviewState,
    answer_text: str,
    room_template,
    repo,
    redis,
    db: AsyncSession,
) -> None:
    """
    1. Persist the answer to the current turn in DB.
    2. Advance turn counter.
    3. Either push the next question or mark state as "ending".
    """
    current_turn = state.turn_number

    # Find the existing DB turn record (created when question was pushed)
    existing_turn = await repo.get_turn(session_id, current_turn)
    if existing_turn is not None:
        await repo.update_turn_answer(
            existing_turn,
            answer_text=answer_text.strip(),
            answered_at=_utcnow(),
        )
        await repo.commit()

    await manager.send_json(session_id, msg_turn_saved(current_turn))

    # Advance
    state.turn_number += 1
    await save_state(redis, state)

    # Check if interview is complete
    if state.turn_number >= state.total_turns:
        state.status = "ending"
        await save_state(redis, state)
        return

    # Push next question
    next_question = _get_question(
        state.turn_number,
        room_template,
        prior_turns=[],  # Phase 5: pass actual prior turns for Gemini context
    )
    await manager.send_json(
        session_id,
        msg_question(
            turn_number=state.turn_number,
            question_text=next_question,
            total_turns=state.total_turns,
        ),
    )

    # Persist the new question turn record immediately
    await repo.create_turn(
        session_id=session_id,
        turn_number=state.turn_number,
        question_text=next_question,
        asked_at=_utcnow(),
    )
    await repo.commit()


async def _handle_end_session(
    *,
    session_id: int,
    state: InterviewState,
    repo,
    redis,
    db: AsyncSession,
) -> None:
    """
    Mark the DB session as completed and clean up Redis state.
    Report generation (Gemini analysis) is triggered in Phase 5.
    """
    from app.repositories.session_repository import SessionRepository

    session = await repo.get_by_id(session_id)
    if session and session.status == "in_progress":
        await repo.complete(session, ended_at=_utcnow())
        await repo.commit()
        logger.info("Session %s marked completed via WS conductor", session_id)

    await clear_state(redis, session_id)


# ── Utility ───────────────────────────────────────────────────────────────────


async def _accept_and_close(websocket: WebSocket, code: int, reason: str) -> None:
    try:
        await websocket.accept()
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass
