from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.sessions import (
    FeedbackReportCreateRequest,
    FeedbackReportResponse,
    InterviewSessionDetailResponse,
    InterviewSessionListResponse,
    SessionCreateRequest,
    SessionStartResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


def _svc(db: AsyncSession = Depends(get_db)) -> SessionService:
    return SessionService(db)


def _display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


# ── List ──────────────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=list[InterviewSessionListResponse],
    summary="List the current user's interview sessions",
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> list[InterviewSessionListResponse]:
    return await svc.list_sessions(current_user.id)


# ── Create ────────────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=InterviewSessionDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new interview session from a room template",
)
async def create_session(
    payload: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> InterviewSessionDetailResponse:
    return await svc.create_session(current_user.id, payload.room_template_id)


# ── Retrieve ──────────────────────────────────────────────────────────────────
@router.get(
    "/{session_id}",
    response_model=InterviewSessionDetailResponse,
    summary="Get full session detail including turns and report",
)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> InterviewSessionDetailResponse:
    return await svc.get_session(session_id, current_user.id)


# ── Start ─────────────────────────────────────────────────────────────────────
@router.post(
    "/{session_id}/start",
    response_model=SessionStartResponse,
    summary="Start a session — transitions to in_progress, issues LiveKit token",
    description=(
        "Idempotent: if the session is already in_progress, returns a fresh "
        "LiveKit token for the existing room (supports page-refresh reconnects)."
    ),
)
async def start_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> SessionStartResponse:
    return await svc.start_session(
        session_id,
        current_user.id,
        display_name=_display_name(current_user),
    )


# ── Complete ──────────────────────────────────────────────────────────────────
@router.post(
    "/{session_id}/complete",
    response_model=InterviewSessionDetailResponse,
    summary="Mark a session as completed",
    description="Called by the frontend or AI service when the interview has ended.",
)
async def complete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> InterviewSessionDetailResponse:
    return await svc.complete_session(session_id, current_user.id)


# ── Cancel ────────────────────────────────────────────────────────────────────
@router.post(
    "/{session_id}/cancel",
    response_model=InterviewSessionDetailResponse,
    summary="Cancel a scheduled or in-progress session",
)
async def cancel_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> InterviewSessionDetailResponse:
    return await svc.cancel_session(session_id, current_user.id)


# ── Report ────────────────────────────────────────────────────────────────────
@router.get(
    "/{session_id}/report",
    response_model=FeedbackReportResponse,
    summary="Retrieve the feedback report for a completed session",
)
async def get_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> FeedbackReportResponse:
    return await svc.get_report(session_id, current_user.id)


@router.post(
    "/{session_id}/report",
    response_model=FeedbackReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit feedback report (called by AI service after analysis)",
)
async def create_report(
    session_id: int,
    payload: FeedbackReportCreateRequest,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> FeedbackReportResponse:
    return await svc.create_report(session_id, current_user.id, payload)
