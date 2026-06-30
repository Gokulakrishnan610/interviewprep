"""
WebSocket interview conductor — thin IO layer.

Endpoint: WS /ws/interview/{session_id}?token=<access_jwt>

Responsibilities here
─────────────────────
  1. JWT auth via query param
  2. Load + validate DB session
  3. Init/restore Redis state
  4. Accept WebSocket and register with ConnectionManager
  5. Push "connected" + first question on fresh connect
  6. Receive loop: parse message type, delegate to InterviewOrchestrator
  7. Persist state on disconnect

All business logic lives in InterviewOrchestrator (app/services/interview_orchestrator.py).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.redis import get_redis_pool
from app.repositories.session_repository import SessionRepository
from app.services.interview_orchestrator import InterviewOrchestrator
from app.websocket.connection_manager import manager
from app.websocket.schemas import (
    InboundAnswer,
    InboundAudioChunk,
    InboundAudioAnswer,
    InboundEndSession,
    InboundPing,
    msg_connected,
    msg_error,
    msg_pong,
    msg_question,
    msg_session_ended,
    msg_thinking,
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


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: int) -> None:
    async with AsyncSessionLocal() as db:
        await _conduct(websocket, session_id, db)


# ── Conductor ─────────────────────────────────────────────────────────────────

async def _conduct(websocket: WebSocket, session_id: int, db: AsyncSession) -> None:
    redis = get_redis_pool()

    # ── Auth ──────────────────────────────────────────────────────────────────
    user = await get_ws_user(websocket, db)
    if user is None:
        return

    # ── Load session ──────────────────────────────────────────────────────────
    repo = SessionRepository(db)
    session = await repo.get_user_session(session_id, user.id)

    if session is None:
        await _reject(websocket, WS_CLOSE_NOT_FOUND, "Session not found.")
        return

    if session.status != "in_progress":
        await _reject(
            websocket,
            WS_CLOSE_FORBIDDEN,
            f'Session is not in_progress (status: "{session.status}").',
        )
        return

    room = session.room_template
    total_turns = InterviewOrchestrator.total_turns_for_template(room)

    # ── Connect & restore state ───────────────────────────────────────────────
    await manager.connect(session_id, websocket)

    state: InterviewState = (
        await load_state(redis, session_id)
        or await init_state(redis, session_id, total_turns=total_turns)
    )
    state.total_turns = total_turns  # re-sync in case template changed

    # ── Build orchestrator ────────────────────────────────────────────────────
    orchestrator = InterviewOrchestrator(
        session_id=session_id,
        room_template=room,
        state=state,
        repo=repo,
        redis=redis,
        manager=manager,
        db=db,
    )

    # ── Send initial state ────────────────────────────────────────────────────
    await manager.send_json(
        session_id,
        msg_connected(
            session_id=session_id,
            turn_number=state.turn_number,
            total_turns=state.total_turns,
        ),
    )

    # ── Push turn-0 question on fresh start ───────────────────────────────────
    if state.turn_number == 0:
        await manager.send_json(session_id, msg_thinking())
        question_text = await orchestrator._generate_question(0, [])
        await manager.send_json(
            session_id,
            msg_question(
                turn_number=0,
                question_text=question_text,
                total_turns=state.total_turns,
            ),
        )
        await repo.create_turn(
            session_id=session_id,
            turn_number=0,
            question_text=question_text,
            asked_at=_utcnow(),
        )
        await repo.commit()

    # ── Receive loop ──────────────────────────────────────────────────────────
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
                    msg_error(f"Unknown message type: '{raw.get('type')}'."),
                )
                continue

            # ── ping ──────────────────────────────────────────────────────────
            if isinstance(msg, InboundPing):
                await manager.send_json(session_id, msg_pong())
                continue

            # ── end_session ───────────────────────────────────────────────────
            if isinstance(msg, InboundEndSession):
                await orchestrator.on_end_session()
                await manager.send_json(session_id, msg_session_ended(session_id))
                break

            # ── audio_chunk (streaming) ───────────────────────────────────────
            if isinstance(msg, InboundAudioChunk):
                await orchestrator.on_audio_chunk(
                    msg.audio_data,
                    msg.mime_type,
                    msg.chunk_final,
                )
                if state.status == "ending":
                    await orchestrator.on_end_session()
                    await manager.send_json(session_id, msg_session_ended(session_id))
                    break
                continue

            # ── audio_answer (complete blob) ──────────────────────────────────
            if isinstance(msg, InboundAudioAnswer):
                # Treat as a single-chunk final flush
                await orchestrator.on_audio_chunk(
                    msg.audio_data,
                    msg.mime_type,
                    chunk_final=True,
                )
                if state.status == "ending":
                    await orchestrator.on_end_session()
                    await manager.send_json(session_id, msg_session_ended(session_id))
                    break
                continue

            # ── text answer ───────────────────────────────────────────────────
            if isinstance(msg, InboundAnswer):
                await orchestrator.on_answer(msg.text)
                if state.status == "ending":
                    await orchestrator.on_end_session()
                    await manager.send_json(session_id, msg_session_ended(session_id))
                    break

    except WebSocketDisconnect:
        logger.info("WS disconnected mid-session: session=%s turn=%s",
                    session_id, state.turn_number)
        await save_state(redis, state)

    except Exception as exc:
        logger.exception("Unhandled error in WS conductor session=%s: %s", session_id, exc)
        try:
            await manager.send_json(
                session_id, msg_error("An internal error occurred.", recoverable=False)
            )
        except Exception:
            pass
        await save_state(redis, state)

    finally:
        manager.disconnect(session_id)


# ── Utility ───────────────────────────────────────────────────────────────────

async def _reject(websocket: WebSocket, code: int, reason: str) -> None:
    try:
        await websocket.accept()
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass
