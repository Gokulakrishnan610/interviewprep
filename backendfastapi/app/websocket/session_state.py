"""
Redis-backed session state for the WebSocket interview conductor.

Key schema
──────────
  interview_state:{session_id}  →  Redis Hash
    turn_number       int     next turn index to ask (0-based)
    total_turns       int     total questions in this interview
    status            str     "in_progress" | "ending"
    last_updated      float   unix timestamp

  interview_audiobuf:{session_id}  →  Redis List
    Each element is one base64-encoded audio chunk string.
    Flushed to Deepgram on InboundAudioChunk(chunk_final=True) or buffer overflow.

TTL
───
  Both keys expire after WS_STATE_TTL_SECONDS (3 hours).
  On graceful end both keys are deleted.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

WS_STATE_TTL_SECONDS = 60 * 60 * 3       # 3 hours
MAX_AUDIO_BUFFER_CHUNKS = 200             # ~20 s of 100 ms chunks before forced flush
_STATE_PREFIX = "interview_state"
_AUDIO_PREFIX = "interview_audiobuf"


def _state_key(sid: int) -> str:
    return f"{_STATE_PREFIX}:{sid}"


def _audio_key(sid: int) -> str:
    return f"{_AUDIO_PREFIX}:{sid}"


# ── State dataclass ───────────────────────────────────────────────────────────

@dataclass
class InterviewState:
    session_id: int
    turn_number: int = 0
    total_turns: int = 5
    status: str = "in_progress"   # "in_progress" | "ending"
    last_updated: float = field(default_factory=time.time)


# ── State persistence ─────────────────────────────────────────────────────────

async def load_state(redis: Redis, session_id: int) -> InterviewState | None:
    raw = await redis.hgetall(_state_key(session_id))
    if not raw:
        return None
    try:
        return InterviewState(
            session_id=session_id,
            turn_number=int(raw.get("turn_number", 0)),
            total_turns=int(raw.get("total_turns", 5)),
            status=raw.get("status", "in_progress"),
            last_updated=float(raw.get("last_updated", time.time())),
        )
    except (ValueError, KeyError) as exc:
        logger.warning("Corrupt Redis state for session %s: %s — resetting", session_id, exc)
        await clear_state(redis, session_id)
        return None


async def save_state(redis: Redis, state: InterviewState) -> None:
    state.last_updated = time.time()
    key = _state_key(state.session_id)
    await redis.hset(
        key,
        mapping={
            "turn_number": state.turn_number,
            "total_turns": state.total_turns,
            "status": state.status,
            "last_updated": state.last_updated,
        },
    )
    await redis.expire(key, WS_STATE_TTL_SECONDS)


async def init_state(
    redis: Redis, session_id: int, total_turns: int
) -> InterviewState:
    state = InterviewState(
        session_id=session_id,
        turn_number=0,
        total_turns=total_turns,
        status="in_progress",
    )
    await save_state(redis, state)
    return state


async def clear_state(redis: Redis, session_id: int) -> None:
    await redis.delete(_state_key(session_id))
    await redis.delete(_audio_key(session_id))
    logger.debug("Cleared Redis state + audio buffer for session %s", session_id)


# ── Audio buffer ──────────────────────────────────────────────────────────────

async def append_audio_chunk(redis: Redis, session_id: int, b64_chunk: str) -> int:
    """
    Append one base64-encoded audio chunk to the Redis list buffer.
    Returns the new buffer length.
    """
    key = _audio_key(session_id)
    length = await redis.rpush(key, b64_chunk)
    await redis.expire(key, WS_STATE_TTL_SECONDS)
    return length


async def flush_audio_buffer(redis: Redis, session_id: int) -> list[str]:
    """
    Atomically return all buffered chunks and clear the list.
    Returns a list of base64-encoded chunk strings (may be empty).
    """
    key = _audio_key(session_id)
    # LRANGE + DEL in a pipeline — atomic enough for single-writer WS model
    async with redis.pipeline(transaction=True) as pipe:
        pipe.lrange(key, 0, -1)
        pipe.delete(key)
        results = await pipe.execute()
    return results[0] or []


async def audio_buffer_length(redis: Redis, session_id: int) -> int:
    return await redis.llen(_audio_key(session_id))
