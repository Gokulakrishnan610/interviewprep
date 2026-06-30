from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis

from app.core.config import settings

# ── Connection pool ───────────────────────────────────────────────────────────
# Created once at startup; shared across all requests via the dependency.
_redis_pool: Optional[Redis] = None


async def init_redis() -> None:
    """
    Called from app lifespan startup.
    Creates the connection pool and validates it with a PING.
    """
    global _redis_pool
    _redis_pool = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )
    # Validate connectivity at startup so we fail fast if Redis is unavailable.
    await _redis_pool.ping()


async def close_redis() -> None:
    """Called from app lifespan shutdown."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


def get_redis_pool() -> Redis:
    """Returns the shared pool; raises if init_redis() was never called."""
    if _redis_pool is None:
        raise RuntimeError("Redis pool not initialised. Call init_redis() first.")
    return _redis_pool


# ── Dependency ────────────────────────────────────────────────────────────────
async def get_redis() -> AsyncGenerator[Redis, None]:
    """
    FastAPI dependency that yields the shared Redis client.
    No per-request connection overhead — uses the pool.
    """
    yield get_redis_pool()
