from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ── Shared ────────────────────────────────────────────────────────────────────
_ROUND_TYPES = {"behavioral", "technical", "system_design", "hr", "mixed"}
_DIFFICULTIES = {"beginner", "intermediate", "advanced"}

_ROUND_TYPE_LABELS = {
    "behavioral": "Behavioral",
    "technical": "Technical",
    "system_design": "System Design",
    "hr": "HR",
    "mixed": "Mixed",
}
_DIFFICULTY_LABELS = {
    "beginner": "Beginner",
    "intermediate": "Intermediate",
    "advanced": "Advanced",
}


# ── List response (compact) ───────────────────────────────────────────────────
class RoomTemplateListResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    company: str
    role: str
    round_type: str
    round_type_display: str
    difficulty: str
    difficulty_display: str
    duration_minutes: int
    interviewer_name: str
    competencies: list[Any]
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: Any) -> "RoomTemplateListResponse":
        return cls(
            id=obj.id,
            slug=obj.slug,
            title=obj.title,
            description=obj.description,
            company=obj.company,
            role=obj.role,
            round_type=obj.round_type,
            round_type_display=_ROUND_TYPE_LABELS.get(obj.round_type, obj.round_type),
            difficulty=obj.difficulty,
            difficulty_display=_DIFFICULTY_LABELS.get(obj.difficulty, obj.difficulty),
            duration_minutes=obj.duration_minutes,
            interviewer_name=obj.interviewer_name,
            competencies=obj.competencies or [],
            is_active=obj.is_active,
        )


# ── Detail response (full) ────────────────────────────────────────────────────
class RoomTemplateDetailResponse(RoomTemplateListResponse):
    interviewer_persona: str
    rubric_dimensions: list[Any]
    created_at: datetime

    @classmethod
    def from_orm(cls, obj: Any) -> "RoomTemplateDetailResponse":  # type: ignore[override]
        base = RoomTemplateListResponse.from_orm(obj)
        return cls(
            **base.model_dump(),
            interviewer_persona=obj.interviewer_persona,
            rubric_dimensions=obj.rubric_dimensions or [],
            created_at=obj.created_at,
        )


# ── Admin create/update (used in admin routes) ────────────────────────────────
class RoomTemplateCreateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    company: str = ""
    role: str = Field(min_length=1, max_length=100)
    round_type: str = Field(pattern="^(behavioral|technical|system_design|hr|mixed)$")
    difficulty: str = Field(pattern="^(beginner|intermediate|advanced)$")
    duration_minutes: int = Field(default=30, ge=5, le=180)
    interviewer_name: str = Field(default="Alex", max_length=100)
    interviewer_persona: str = ""
    competencies: list[str] = []
    rubric_dimensions: list[dict] = []
    is_active: bool = True


class RoomTemplateUpdateRequest(BaseModel):
    """All fields optional — supports partial PATCH."""
    slug: str | None = Field(default=None, min_length=1, max_length=100)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    company: str | None = None
    role: str | None = Field(default=None, min_length=1, max_length=100)
    round_type: str | None = Field(
        default=None, pattern="^(behavioral|technical|system_design|hr|mixed)$"
    )
    difficulty: str | None = Field(
        default=None, pattern="^(beginner|intermediate|advanced)$"
    )
    duration_minutes: int | None = Field(default=None, ge=5, le=180)
    interviewer_name: str | None = Field(default=None, max_length=100)
    interviewer_persona: str | None = None
    competencies: list[str] | None = None
    rubric_dimensions: list[dict] | None = None
    is_active: bool | None = None
