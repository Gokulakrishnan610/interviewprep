from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.integrations.livekit_client import LiveKitClient
from app.repositories.room_repository import RoomRepository
from app.repositories.session_repository import SessionRepository
from app.schemas.sessions import (
    FeedbackReportCreateRequest,
    FeedbackReportResponse,
    InterviewSessionDetailResponse,
    InterviewSessionListResponse,
    ReportStatusResponse,
    SessionStartResponse,
)
from app.tasks.report_tasks import get_report_status, schedule_report

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_livekit_token(user_id: int, display_name: str, room_name: str) -> str:
    """Delegate to LiveKitClient — all SDK logic lives in the integration layer."""
    client = LiveKitClient()
    return client.create_join_token(
        user_id=user_id,
        display_name=display_name,
        room_name=room_name,
    )


class SessionService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = SessionRepository(db)
        self._room_repo = RoomRepository(db)

    # ── List ──────────────────────────────────────────────────────────────────
    async def list_sessions(self, user_id: int) -> list[InterviewSessionListResponse]:
        sessions = await self._repo.list_for_user(user_id)
        return [InterviewSessionListResponse.from_orm(s) for s in sessions]

    # ── Create ────────────────────────────────────────────────────────────────
    async def create_session(
        self, user_id: int, room_template_id: int
    ) -> InterviewSessionDetailResponse:
        room = await self._room_repo.get_by_id(room_template_id)
        if not room or not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room template not found or inactive.",
            )

        session = await self._repo.create(
            user_id=user_id,
            room_template_id=room_template_id,
        )
        await self._repo.commit()
        return InterviewSessionDetailResponse.from_orm(session)

    # ── Retrieve ──────────────────────────────────────────────────────────────
    async def get_session(
        self, session_id: int, user_id: int
    ) -> InterviewSessionDetailResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        return InterviewSessionDetailResponse.from_orm(session)

    # ── Start ─────────────────────────────────────────────────────────────────
    async def start_session(
        self,
        session_id: int,
        user_id: int,
        *,
        display_name: str,
    ) -> SessionStartResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

        # Idempotent: already started → return a fresh token for the same room
        if session.status == "in_progress":
            lk = LiveKitClient()
            livekit_token = lk.create_join_token(
                user_id=user_id,
                display_name=display_name,
                room_name=session.livekit_room_name,
            )
            return SessionStartResponse(
                session=InterviewSessionDetailResponse.from_orm(session),
                livekit_token=livekit_token,
                livekit_room_name=session.livekit_room_name,
                livekit_url=lk.server_url,
            )

        if session.status != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Session cannot be started from status "{session.status}".',
            )

        room_name = f"interview-{uuid.uuid4().hex[:12]}"
        lk = LiveKitClient()
        livekit_token = lk.create_join_token(
            user_id=user_id,
            display_name=display_name,
            room_name=room_name,
        )

        session = await self._repo.start(
            session, room_name=room_name, started_at=_utcnow()
        )
        await self._repo.commit()

        return SessionStartResponse(
            session=InterviewSessionDetailResponse.from_orm(session),
            livekit_token=livekit_token,
            livekit_room_name=room_name,
            livekit_url=lk.server_url,
        )

    # ── Complete ──────────────────────────────────────────────────────────────
    async def complete_session(
        self, session_id: int, user_id: int
    ) -> InterviewSessionDetailResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        if session.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Session cannot be completed from status "{session.status}".',
            )

        session = await self._repo.complete(session, ended_at=_utcnow())
        await self._repo.commit()

        # Fire report generation in the background — non-blocking
        schedule_report(session_id)
        logger.info("Report task scheduled after REST complete for session %s", session_id)

        return InterviewSessionDetailResponse.from_orm(session)

    # ── Cancel ────────────────────────────────────────────────────────────────
    async def cancel_session(
        self, session_id: int, user_id: int
    ) -> InterviewSessionDetailResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        if session.status not in ("scheduled", "in_progress"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Session cannot be cancelled from status "{session.status}".',
            )

        session = await self._repo.cancel(session, ended_at=_utcnow())
        await self._repo.commit()
        return InterviewSessionDetailResponse.from_orm(session)

    # ── Report ────────────────────────────────────────────────────────────────
    async def get_report(
        self, session_id: int, user_id: int
    ) -> FeedbackReportResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        if session.report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not available yet. Check GET /sessions/{id}/report/status.",
            )
        return FeedbackReportResponse.model_validate(session.report)

    async def create_report(
        self,
        session_id: int,
        user_id: int,
        payload: FeedbackReportCreateRequest,
    ) -> FeedbackReportResponse:
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        if session.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Report can only be submitted for completed sessions.",
            )
        if session.report is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Report already exists for this session.",
            )

        report = await self._repo.create_report(
            session_id=session_id,
            overall_score=payload.overall_score,
            dimension_scores=payload.dimension_scores,
            strengths=payload.strengths,
            weaknesses=payload.weaknesses,
            recommendations=payload.recommendations,
            raw_ai_response=payload.raw_ai_response,
        )
        await self._repo.commit()
        return FeedbackReportResponse.model_validate(report)
