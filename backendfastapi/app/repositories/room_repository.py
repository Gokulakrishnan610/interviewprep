from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import InterviewRoomTemplate


class RoomRepository:
    """
    Queries for InterviewRoomTemplate.
    Read-only methods are used by regular routes.
    Write methods are gated behind admin auth.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Read ──────────────────────────────────────────────────────────────────

    async def list_active(
        self,
        *,
        round_type: str | None = None,
        difficulty: str | None = None,
        company: str | None = None,
        search: str | None = None,
    ) -> list[InterviewRoomTemplate]:
        q = select(InterviewRoomTemplate).where(InterviewRoomTemplate.is_active.is_(True))
        q = self._apply_filters(q, round_type=round_type, difficulty=difficulty,
                                company=company, search=search)
        q = q.order_by(InterviewRoomTemplate.company, InterviewRoomTemplate.role)
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def list_all(
        self,
        *,
        round_type: str | None = None,
        difficulty: str | None = None,
        company: str | None = None,
        search: str | None = None,
    ) -> list[InterviewRoomTemplate]:
        """Admin list — includes inactive rooms."""
        q = select(InterviewRoomTemplate)
        q = self._apply_filters(q, round_type=round_type, difficulty=difficulty,
                                company=company, search=search)
        q = q.order_by(InterviewRoomTemplate.company, InterviewRoomTemplate.role)
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def get_by_id(self, room_id: int) -> InterviewRoomTemplate | None:
        result = await self._db.execute(
            select(InterviewRoomTemplate).where(InterviewRoomTemplate.id == room_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> InterviewRoomTemplate | None:
        result = await self._db.execute(
            select(InterviewRoomTemplate).where(InterviewRoomTemplate.slug == slug)
        )
        return result.scalar_one_or_none()

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create(self, **kwargs) -> InterviewRoomTemplate:
        room = InterviewRoomTemplate(**kwargs)
        self._db.add(room)
        await self._db.flush()
        return room

    async def update(
        self, room: InterviewRoomTemplate, **kwargs
    ) -> InterviewRoomTemplate:
        for key, value in kwargs.items():
            setattr(room, key, value)
        self._db.add(room)
        await self._db.flush()
        return room

    async def update(self, room: InterviewRoomTemplate, data: dict) -> InterviewRoomTemplate:
        for key, value in data.items():
            setattr(room, key, value)
        self._db.add(room)
        await self._db.flush()
        return room

    async def commit(self) -> None:
        await self._db.commit()

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _apply_filters(q, *, round_type, difficulty, company, search):
        if round_type:
            q = q.where(InterviewRoomTemplate.round_type == round_type)
        if difficulty:
            q = q.where(InterviewRoomTemplate.difficulty == difficulty)
        if company:
            q = q.where(InterviewRoomTemplate.company.ilike(f"%{company}%"))
        if search:
            pattern = f"%{search}%"
            q = q.where(
                InterviewRoomTemplate.title.ilike(pattern)
                | InterviewRoomTemplate.description.ilike(pattern)
                | InterviewRoomTemplate.role.ilike(pattern)
                | InterviewRoomTemplate.company.ilike(pattern)
            )
        return q