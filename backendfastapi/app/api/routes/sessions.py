from __future__ import annotations

from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, get_redis
from app.models.user import User
from app.schemas.sessions import (
    FeedbackReportCreateRequest,
    FeedbackReportResponse,
    InterviewSessionDetailResponse,
    InterviewSessionListResponse,
    ReportStatusResponse,
    SessionCreateRequest,
    SessionStartResponse,
)
from app.services.report_service import ReportService
from app.services.session_service import SessionService

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


# ── Dependency factories ──────────────────────────────────────────────────────

def _svc(db: AsyncSession = Depends(get_db)) -> SessionService:
    return SessionService(db)


def _report_svc(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> ReportService:
    return ReportService(db, redis)


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
    summary="Mark a session as completed — triggers async report generation",
    description=(
        "Transitions status to completed and fires the background report "
        "generation task. Poll GET /sessions/{id}/report/status for progress."
    ),
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
    summary="Retrieve the completed feedback report",
    description="Returns 404 with a hint to check /report/status if generation is not done.",
)
async def get_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: ReportService = Depends(_report_svc),
) -> FeedbackReportResponse:
    return await svc.get_report(session_id, current_user.id)


@router.get(
    "/{session_id}/report/status",
    response_model=ReportStatusResponse,
    summary="Poll report generation progress",
    description=(
        "Returns the current generation status: pending | running | done | failed | unknown. "
        "Poll this endpoint after completing a session until status is 'done'."
    ),
)
async def get_report_status(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: ReportService = Depends(_report_svc),
) -> ReportStatusResponse:
    return await svc.get_status(session_id, current_user.id)


@router.post(
    "/{session_id}/report/generate",
    response_model=ReportStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger (or re-trigger) report generation for a completed session",
    description=(
        "Safe to call multiple times — idempotent. "
        "Returns immediately; generation runs in the background. "
        "Poll GET /sessions/{id}/report/status for progress."
    ),
)
async def generate_report(
    session_id: int,
    current_user: User = Depends(get_current_user),
    svc: ReportService = Depends(_report_svc),
) -> ReportStatusResponse:
    return await svc.trigger_report(session_id, current_user.id)


@router.post(
    "/{session_id}/report",
    response_model=FeedbackReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually submit a feedback report payload",
    description="Allows external services to submit a pre-computed report.",
)
async def create_report(
    session_id: int,
    payload: FeedbackReportCreateRequest,
    current_user: User = Depends(get_current_user),
    svc: SessionService = Depends(_svc),
) -> FeedbackReportResponse:
    return await svc.create_report(session_id, current_user.id, payload)
