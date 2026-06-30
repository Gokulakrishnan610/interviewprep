"""
Redis-backed session state for the WebSocket interview conductor.

Purpose
-------
Stores lightweight, volatile interview progress in Redis so that:
  1. A page-refresh or brief disconnect can reconnect and resume
     without reloading everything from Postgres.
  2. The WS conductor always has a fast source-of-truth for
     "which turn are we on?" without a DB round-trip per message.

Key schema
----------
  interview_state:{session_id}  →  Redis Hash
    turn_number     int     next turn index to ask (0-based)
    total_turns     int     total questions in this interview
    status          str     "in_progress" | "ending"
    last_updated    float   unix timestamp

TTL
---
  Keys expire after WS_STATE_TTL_SECONDS (default 3 hours).
  On graceful end, the key is deleted immediately.
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

# Redis key TTL in seconds (3 hours covers long interviews + reconnect windows)
WS_STATE_TTL_SECONDS = 60 * 60 * 3
_KEY_PREFIX = "interview_state"


def _state_key(session_id: int) -> str:
    return f"{_KEY_PREFIX}:{session_id}"


@dataclass
class InterviewState:
    session_id: int
    turn_number: int = 0       # index of the NEXT turn to ask (0 = not started)
    total_turns: int = 5       # determined from room_template questions / config
    status: str = "in_progress"
    last_updated: float = field(default_factory=time.time)


async def load_state(redis: Redis, session_id: int) -> InterviewState | None:
    """
    Load existing state from Redis.
    Returns None if no state exists (fresh connection or TTL expired).
    """
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
    """Persist state to Redis with a rolling TTL."""
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


async def clear_state(redis: Redis, session_id: int) -> None:
    """Delete state key on graceful session end."""
    await redis.delete(_state_key(session_id))
    logger.debug("Cleared Redis state for session %s", session_id)


async def init_state(
    redis: Redis,
    session_id: int,
    total_turns: int,
) -> InterviewState:
    """
    Create a fresh state for a session.
    Called on the first ever connection (no existing Redis state).
    """
    state = InterviewState(
        session_id=session_id,
        turn_number=0,
        total_turns=total_turns,
        status="in_progress",
    )
    await save_state(redis, state)
    return state
