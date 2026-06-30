from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.room_repository import RoomRepository
from app.schemas.rooms import (
    RoomTemplateCreateRequest,
    RoomTemplateDetailResponse,
    RoomTemplateListResponse,
    RoomTemplateUpdateRequest,
)

logger = logging.getLogger(__name__)


class RoomService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = RoomRepository(db)

    # ── Public read ───────────────────────────────────────────────────────────

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

    # ── Admin write ───────────────────────────────────────────────────────────

    async def create_room(
        self, payload: RoomTemplateCreateRequest
    ) -> RoomTemplateDetailResponse:
        # Reject duplicate slugs
        existing = await self._repo.get_by_slug(payload.slug)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A room template with slug '{payload.slug}' already exists.",
            )
        room = await self._repo.create(**payload.model_dump())
        await self._repo.commit()
        # Re-fetch to get server-generated fields (created_at etc.)
        room = await self._repo.get_by_id(room.id)  # type: ignore[assignment]
        return RoomTemplateDetailResponse.from_orm(room)

    async def update_room(
        self, room_id: int, payload: RoomTemplateUpdateRequest
    ) -> RoomTemplateDetailResponse:
        room = await self._repo.get_by_id(room_id)
        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room template not found.",
            )
        # Slug uniqueness check (only if slug is being changed)
        if payload.slug is not None and payload.slug != room.slug:
            clash = await self._repo.get_by_slug(payload.slug)
            if clash is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Slug '{payload.slug}' is already taken.",
                )
        room = await self._repo.update(room, payload.model_dump(exclude_none=True))
        await self._repo.commit()
        return RoomTemplateDetailResponse.from_orm(room)

    async def deactivate_room(self, room_id: int) -> RoomTemplateDetailResponse:
        room = await self._repo.get_by_id(room_id)
        if room is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room template not found.",
            )
        room = await self._repo.update(room, {"is_active": False})
        await self._repo.commit()
        return RoomTemplateDetailResponse.from_orm(room)

    async def seed_rooms(
        self, rooms_data: list[dict]
    ) -> dict[str, int]:
        """
        Idempotent bulk insert: insert rooms whose slug doesn't already exist.
        Returns counts of inserted vs skipped.
        """
        inserted = 0
        skipped = 0
        for data in rooms_data:
            existing = await self._repo.get_by_slug(data["slug"])
            if existing is not None:
                skipped += 1
                continue
            await self._repo.create(**data)
            inserted += 1
        await self._repo.commit()
        logger.info("Room seed: inserted=%d skipped=%d", inserted, skipped)
        return {"inserted": inserted, "skipped": skipped}
