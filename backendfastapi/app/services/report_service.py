"""
ReportService — report lifecycle management.

Handles:
  - trigger_report   : validate session is completed, fire task if no report exists
  - get_report       : fetch completed report (raises 404 if not ready)
  - get_report_status: poll Redis for generation progress
"""
from __future__ import annotations

import logging

from fastapi import HTTPException, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.session_repository import SessionRepository
from app.schemas.sessions import FeedbackReportResponse, ReportStatusResponse
from app.tasks.report_tasks import get_report_status, schedule_report

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, db: AsyncSession, redis: Redis) -> None:
        self._repo = SessionRepository(db)
        self._redis = redis

    # ── Get existing report ───────────────────────────────────────────────────

    async def get_report(self, session_id: int, user_id: int) -> FeedbackReportResponse:
        """Return the persisted report or 404 if not ready yet."""
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )
        if session.report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not available yet. Check /report/status for progress.",
            )
        return FeedbackReportResponse.model_validate(session.report)

    # ── Poll status ───────────────────────────────────────────────────────────

    async def get_status(self, session_id: int, user_id: int) -> ReportStatusResponse:
        """
        Return the generation status from Redis.

        If the report is already in DB, status is always "done" regardless of
        the Redis key (handles cases where Redis TTL expired after completion).
        """
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

        # DB is source of truth for completion
        if session.report is not None:
            return ReportStatusResponse(
                session_id=session_id,
                status="done",
                report_id=session.report.id,
            )

        raw = await get_report_status(self._redis, session_id)
        return ReportStatusResponse(
            session_id=session_id,
            status=raw["status"],
            error=raw.get("error") or None,
        )

    # ── Trigger (or re-trigger) ───────────────────────────────────────────────

    async def trigger_report(self, session_id: int, user_id: int) -> ReportStatusResponse:
        """
        Trigger report generation for a completed session.

        - If a report already exists → returns "done" immediately.
        - If a task is already running → returns "running" without spawning another.
        - Otherwise → schedules the task and returns "pending".

        Callers: REST complete endpoint and manual re-trigger endpoint.
        """
        session = await self._repo.get_user_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found.",
            )

        if session.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Report can only be generated for completed sessions (current: "{session.status}").',
            )

        # Already done
        if session.report is not None:
            return ReportStatusResponse(
                session_id=session_id,
                status="done",
                report_id=session.report.id,
            )

        # Check if already running in Redis
        raw = await get_report_status(self._redis, session_id)
        if raw["status"] == "running":
            return ReportStatusResponse(session_id=session_id, status="running")

        # Schedule
        schedule_report(session_id)
        logger.info("Report task scheduled for session %s by ReportService", session_id)
        return ReportStatusResponse(session_id=session_id, status="pending")
