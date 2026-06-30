from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.rooms import RoomTemplateDetailResponse, RoomTemplateListResponse
from app.services.room_service import RoomService

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


def _svc(db: AsyncSession = Depends(get_db)) -> RoomService:
    return RoomService(db)


@router.get(
    "",
    response_model=list[RoomTemplateListResponse],
    summary="List active room templates",
    description=(
        "Returns all active interview room templates. "
        "Supports optional filtering by round_type, difficulty, and company, "
        "plus a free-text search across title, description, role, and company."
    ),
)
async def list_rooms(
    round_type: str | None = Query(
        default=None,
        pattern="^(behavioral|technical|system_design|hr|mixed)$",
        description="Filter by round type",
    ),
    difficulty: str | None = Query(
        default=None,
        pattern="^(beginner|intermediate|advanced)$",
        description="Filter by difficulty",
    ),
    company: str | None = Query(default=None, description="Filter by company name"),
    search: str | None = Query(
        default=None, description="Free-text search on title, description, role, company"
    ),
    svc: RoomService = Depends(_svc),
    _: User = Depends(get_current_user),
) -> list[RoomTemplateListResponse]:
    return await svc.list_rooms(
        round_type=round_type,
        difficulty=difficulty,
        company=company,
        search=search,
    )


@router.get(
    "/{room_id}",
    response_model=RoomTemplateDetailResponse,
    summary="Get room template detail",
    description="Returns the full room template including interviewer persona and rubric dimensions.",
)
async def get_room(
    room_id: int,
    svc: RoomService = Depends(_svc),
    _: User = Depends(get_current_user),
) -> RoomTemplateDetailResponse:
    return await svc.get_room(room_id)
