from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import FeedbackReport, InterviewSession, InterviewTurn


class SessionRepository:
    """
    All DB queries for InterviewSession, InterviewTurn, and FeedbackReport.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Load helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def _full_load():
        """Eager-load options for a session with all related data."""
        return [
            selectinload(InterviewSession.room_template),
            selectinload(InterviewSession.turns),
            selectinload(InterviewSession.report),
        ]

    # ── Session queries ───────────────────────────────────────────────────────
    async def list_for_user(self, user_id: int) -> list[InterviewSession]:
        result = await self._db.execute(
            select(InterviewSession)
            .options(*self._full_load())
            .where(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, session_id: int) -> InterviewSession | None:
        result = await self._db.execute(
            select(InterviewSession)
            .options(*self._full_load())
            .where(InterviewSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_user_session(
        self, session_id: int, user_id: int
    ) -> InterviewSession | None:
        """Get session only if it belongs to the given user."""
        result = await self._db.execute(
            select(InterviewSession)
            .options(*self._full_load())
            .where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self, *, user_id: int, room_template_id: int
    ) -> InterviewSession:
        session = InterviewSession(
            user_id=user_id,
            room_template_id=room_template_id,
            status="scheduled",
        )
        self._db.add(session)
        await self._db.flush()
        # Re-fetch with full load so callers get a complete object
        return await self.get_by_id(session.id)  # type: ignore[return-value]

    async def start(
        self, session: InterviewSession, *, room_name: str, started_at: datetime
    ) -> InterviewSession:
        session.status = "in_progress"
        session.livekit_room_name = room_name
        session.started_at = started_at
        self._db.add(session)
        await self._db.flush()
        return session

    async def complete(
        self, session: InterviewSession, *, ended_at: datetime
    ) -> InterviewSession:
        session.status = "completed"
        session.ended_at = ended_at
        self._db.add(session)
        await self._db.flush()
        return session

    async def cancel(
        self, session: InterviewSession, *, ended_at: datetime
    ) -> InterviewSession:
        session.status = "cancelled"
        session.ended_at = ended_at
        self._db.add(session)
        await self._db.flush()
        return session

    # ── Turn queries ──────────────────────────────────────────────────────────
    async def create_turn(
        self,
        *,
        session_id: int,
        turn_number: int,
        question_text: str,
        asked_at: datetime | None = None,
    ) -> InterviewTurn:
        turn = InterviewTurn(
            session_id=session_id,
            turn_number=turn_number,
            question_text=question_text,
            asked_at=asked_at,
        )
        self._db.add(turn)
        await self._db.flush()
        return turn

    async def update_turn_answer(
        self,
        turn: InterviewTurn,
        *,
        answer_text: str = "",
        answer_audio_url: str = "",
        answered_at: datetime | None = None,
    ) -> InterviewTurn:
        turn.answer_text = answer_text
        turn.answer_audio_url = answer_audio_url
        turn.answered_at = answered_at
        self._db.add(turn)
        await self._db.flush()
        return turn

    async def get_turn(self, session_id: int, turn_number: int) -> InterviewTurn | None:
        result = await self._db.execute(
            select(InterviewTurn).where(
                InterviewTurn.session_id == session_id,
                InterviewTurn.turn_number == turn_number,
            )
        )
        return result.scalar_one_or_none()
    # ── Report queries ────────────────────────────────────────────────────────
    async def create_report(
        self,
        *,
        session_id: int,
        overall_score: float | None,
        dimension_scores: dict,
        strengths: list,
        weaknesses: list,
        recommendations: list,
        raw_ai_response: str = "",
    ) -> FeedbackReport:
        report = FeedbackReport(
            session_id=session_id,
            overall_score=overall_score,
            dimension_scores=dimension_scores,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
            raw_ai_response=raw_ai_response,
        )
        self._db.add(report)
        await self._db.flush()
        return report
    async def commit(self) -> None:
        await self._db.commit()