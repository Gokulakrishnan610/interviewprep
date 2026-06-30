from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.room_repository import RoomRepository
from app.schemas.rooms import RoomTemplateDetailResponse, RoomTemplateListResponse


class RoomService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = RoomRepository(db)

    async def list_rooms(
        self,
        *,
        round_type: str | None = None,
        difficulty: str | None = None,
        company: str | None = None,
        search: str | None = None,
    ) -> list[RoomTemplateListResponse]:
        rooms = await self._repo.list_active(
            round_type=round_type,
            difficulty=difficulty,
            company=company,
            search=search,
        )
        return [RoomTemplateListResponse.from_orm(r) for r in rooms]

    async def get_room(self, room_id: int) -> RoomTemplateDetailResponse:
        room = await self._repo.get_by_id(room_id)
        if not room or not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room template not found.",
            )
        return RoomTemplateDetailResponse.from_orm(room)
