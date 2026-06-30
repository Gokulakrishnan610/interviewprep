from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import settings
from app.core.redis import close_redis, init_redis

logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic executed around the ASGI app lifecycle."""
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Starting %s v%s [%s]", settings.APP_NAME, settings.VERSION, settings.ENVIRONMENT)

    try:
        await init_redis()
        logger.info("Redis connected: %s", settings.REDIS_URL)
    except Exception as exc:
        # Redis is required; fail fast if unavailable.
        logger.error("Redis connection failed: %s", exc)
        raise

    yield  # ← app runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    await close_redis()
    logger.info("Redis closed. Shutdown complete.")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Standalone AI interview preparation backend.",
    default_response_class=ORJSONResponse,  # faster JSON serialisation
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.routes import auth, rooms, sessions  # noqa: E402

app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(sessions.router)

# Phase 4:  from app.websocket import router as ws_router; app.include_router(ws_router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": f"{settings.APP_NAME} is running. See /docs for the API."}
