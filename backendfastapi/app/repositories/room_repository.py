from __future__ import annotations
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.room import InterviewRoomTemplate
class RoomRepository:
    """
    Read-only queries for InterviewRoomTemplate.
    Rooms are admin-managed; users never write them.
    """
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
    async def list_active(
        self,
        *,
        round_type: str | None = None,
        difficulty: str | None = None,
        company: str | None = None,
        search: str | None = None,
    ) -> list[InterviewRoomTemplate]:
        q = select(InterviewRoomTemplate).where(InterviewRoomTemplate.is_active.is_(True))
        if round_type:
            q = q.where(InterviewRoomTemplate.round_type == round_type)
        if difficulty:
            q = q.where(InterviewRoomTemplate.difficulty == difficulty)
        if company:
            # case-insensitive contains match
            q = q.where(InterviewRoomTemplate.company.ilike(f"%{company}%"))
        if search:
            pattern = f"%{search}%"
            q = q.where(
                InterviewRoomTemplate.title.ilike(pattern)
                | InterviewRoomTemplate.description.ilike(pattern)
                | InterviewRoomTemplate.role.ilike(pattern)
                | InterviewRoomTemplate.company.ilike(pattern)
            )
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
    # ── Admin writes (used by seeding/admin routes) ───────────────────────────
    async def create(self, **kwargs) -> InterviewRoomTemplate:
        room = InterviewRoomTemplate(**kwargs)
        self._db.add(room)
        await self._db.flush()
        return room
    async def commit(self) -> None:
        await self._db.commit()