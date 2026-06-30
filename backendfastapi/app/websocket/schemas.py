"""
WebSocket message schemas.

All messages are JSON objects with a mandatory "type" discriminator field.

Client → Server (inbound)
──────────────────────────
  answer            plain-text answer submission
  audio_chunk       a single streaming audio chunk (base64); accumulates until
                    silence detected or chunk_final=True, then Deepgram is called
  audio_answer      complete pre-recorded audio blob (base64) — legacy/fallback path
  ping              keep-alive heartbeat
  end_session       client requests graceful session end

Server → Client (outbound)
───────────────────────────
  connected         handshake confirmed, current progress delivered
  question          AI interviewer poses a question
  thinking          server is generating the next question (spinner hint)
  transcript_partial real-time partial transcript echo (optional UX)
  transcript_final  final confirmed transcript before answer is saved
  turn_saved        turn persisted to DB; ack with turn_number
  session_ended     interview finished, report generation triggered
  error             non-fatal error with detail string
  pong              keep-alive reply
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Inbound ───────────────────────────────────────────────────────────────────

class InboundAnswer(BaseModel):
    type: Literal["answer"]
    text: str = Field(min_length=1)


class InboundAudioChunk(BaseModel):
    """
    A single streamed audio chunk from the client microphone.

    Chunks accumulate in Redis until:
      - chunk_final is True  (client signals silence / end of utterance), or
      - the accumulated buffer exceeds MAX_AUDIO_BUFFER_KB

    The orchestrator then flushes the buffer to Deepgram pre-recorded API.
    """
    type: Literal["audio_chunk"]
    audio_data: str            # base64-encoded chunk bytes
    mime_type: str = "audio/webm"
    chunk_final: bool = False  # True = end of utterance, flush buffer now


class InboundAudioAnswer(BaseModel):
    """
    Complete pre-recorded audio blob — sent as a single message.
    Used when the client records a full answer before submitting.
    """
    type: Literal["audio_answer"]
    audio_data: str            # base64-encoded complete recording
    mime_type: str = "audio/webm"


class InboundPing(BaseModel):
    type: Literal["ping"]


class InboundEndSession(BaseModel):
    type: Literal["end_session"]


InboundMessage = (
    InboundAnswer
    | InboundAudioChunk
    | InboundAudioAnswer
    | InboundPing
    | InboundEndSession
)


def parse_inbound(data: dict[str, Any]) -> InboundMessage | None:
    msg_type = data.get("type")
    if msg_type == "answer":
        return InboundAnswer.model_validate(data)
    if msg_type == "audio_chunk":
        return InboundAudioChunk.model_validate(data)
    if msg_type == "audio_answer":
        return InboundAudioAnswer.model_validate(data)
    if msg_type == "ping":
        return InboundPing.model_validate(data)
    if msg_type == "end_session":
        return InboundEndSession.model_validate(data)
    return None


# ── Outbound helpers ──────────────────────────────────────────────────────────

def msg_connected(session_id: int, turn_number: int, total_turns: int) -> dict:
    return {
        "type": "connected",
        "session_id": session_id,
        "turn_number": turn_number,
        "total_turns": total_turns,
    }


def msg_thinking() -> dict:
    """Server is calling Gemini — client should show a spinner."""
    return {"type": "thinking"}


def msg_question(turn_number: int, question_text: str, total_turns: int) -> dict:
    return {
        "type": "question",
        "turn_number": turn_number,
        "question_text": question_text,
        "total_turns": total_turns,
    }


def msg_transcript_partial(text: str) -> dict:
    """Echo partial transcript while audio buffer accumulates (UX hint)."""
    return {"type": "transcript_partial", "text": text}


def msg_transcript_final(text: str, confidence: float = 0.0) -> dict:
    """Final confirmed transcript before the answer is persisted."""
    return {"type": "transcript_final", "text": text, "confidence": confidence}


def msg_turn_saved(turn_number: int) -> dict:
    return {"type": "turn_saved", "turn_number": turn_number}


def msg_session_ended(session_id: int) -> dict:
    return {
        "type": "session_ended",
        "session_id": session_id,
        "message": "Interview complete. Your feedback report is being generated.",
    }


def msg_error(detail: str, *, recoverable: bool = True) -> dict:
    return {"type": "error", "detail": detail, "recoverable": recoverable}


def msg_pong() -> dict:
    return {"type": "pong"}
