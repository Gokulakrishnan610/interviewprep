"""
WebSocket message schemas.

All messages are JSON objects with a mandatory "type" discriminator field.

Client → Server (inbound):
  - answer        : user submits a text answer
  - audio_answer  : user submits base64-encoded audio (Deepgram STT in Phase 5)
  - ping          : keep-alive heartbeat
  - end_session   : client requests graceful session end

Server → Client (outbound):
  - connected     : handshake confirmed, initial state delivered
  - question      : AI interviewer asks a question
  - turn_saved    : turn persisted; ack with turn number
  - session_ended : interview finished, report generation triggered
  - error         : non-fatal error description
  - pong          : keep-alive reply
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


# ── Inbound ───────────────────────────────────────────────────────────────────

class InboundAnswer(BaseModel):
    type: Literal["answer"]
    text: str


class InboundAudioAnswer(BaseModel):
    """
    Phase 5: audio_data is base64-encoded WAV/WebM.
    Scaffold only — Deepgram STT not wired yet.
    """
    type: Literal["audio_answer"]
    audio_data: str          # base64
    mime_type: str = "audio/webm"


class InboundPing(BaseModel):
    type: Literal["ping"]


class InboundEndSession(BaseModel):
    type: Literal["end_session"]


# Union for parsing; discriminated by "type" field
InboundMessage = InboundAnswer | InboundAudioAnswer | InboundPing | InboundEndSession


def parse_inbound(data: dict[str, Any]) -> InboundMessage | None:
    """
    Attempt to parse a raw dict into a typed inbound message.
    Returns None if the type is unrecognised — caller should send an error.
    """
    msg_type = data.get("type")
    if msg_type == "answer":
        return InboundAnswer.model_validate(data)
    if msg_type == "audio_answer":
        return InboundAudioAnswer.model_validate(data)
    if msg_type == "ping":
        return InboundPing.model_validate(data)
    if msg_type == "end_session":
        return InboundEndSession.model_validate(data)
    return None


# ── Outbound ──────────────────────────────────────────────────────────────────

def msg_connected(session_id: int, turn_number: int, total_turns: int) -> dict:
    return {
        "type": "connected",
        "session_id": session_id,
        "turn_number": turn_number,   # next turn to ask (0 = interview not started)
        "total_turns": total_turns,
    }


def msg_question(turn_number: int, question_text: str, total_turns: int) -> dict:
    return {
        "type": "question",
        "turn_number": turn_number,
        "question_text": question_text,
        "total_turns": total_turns,
    }


def msg_turn_saved(turn_number: int) -> dict:
    return {
        "type": "turn_saved",
        "turn_number": turn_number,
    }


def msg_session_ended(session_id: int) -> dict:
    return {
        "type": "session_ended",
        "session_id": session_id,
        "message": "Interview complete. Your feedback report is being generated.",
    }


def msg_error(detail: str) -> dict:
    return {
        "type": "error",
        "detail": detail,
    }


def msg_pong() -> dict:
    return {"type": "pong"}
