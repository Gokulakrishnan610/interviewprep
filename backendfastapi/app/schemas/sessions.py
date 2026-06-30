from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.rooms import RoomTemplateListResponse


# ── InterviewTurn ─────────────────────────────────────────────────────────────
class InterviewTurnResponse(BaseModel):
    id: int
    turn_number: int
    question_text: str
    asked_at: datetime | None
    answer_text: str
    answer_audio_url: str
    answered_at: datetime | None

    model_config = {"from_attributes": True}


# ── FeedbackReport ────────────────────────────────────────────────────────────
class FeedbackReportResponse(BaseModel):
    id: int
    overall_score: float | None
    dimension_scores: dict[str, Any]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackReportCreateRequest(BaseModel):
    overall_score: float | None = Field(default=None, ge=0, le=10)
    dimension_scores: dict[str, Any] = {}
    strengths: list[str] = []
    weaknesses: list[str] = []
    recommendations: list[str] = []
    raw_ai_response: str = ""


# ── InterviewSession list (compact) ───────────────────────────────────────────
class InterviewSessionListResponse(BaseModel):
    id: int
    room_template: RoomTemplateListResponse
    status: str
    livekit_room_name: str
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    overall_score: float | None  # pulled from report if available

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: Any) -> "InterviewSessionListResponse":
        overall_score = None
        if obj.report is not None:
            overall_score = obj.report.overall_score
        return cls(
            id=obj.id,
            room_template=RoomTemplateListResponse.from_orm(obj.room_template),
            status=obj.status,
            livekit_room_name=obj.livekit_room_name,
            started_at=obj.started_at,
            ended_at=obj.ended_at,
            created_at=obj.created_at,
            overall_score=overall_score,
        )


# ── InterviewSession detail (full) ────────────────────────────────────────────
class InterviewSessionDetailResponse(BaseModel):
    id: int
    room_template: RoomTemplateListResponse
    status: str
    livekit_room_name: str
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    turns: list[InterviewTurnResponse]
    report: FeedbackReportResponse | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, obj: Any) -> "InterviewSessionDetailResponse":
        return cls(
            id=obj.id,
            room_template=RoomTemplateListResponse.from_orm(obj.room_template),
            status=obj.status,
            livekit_room_name=obj.livekit_room_name,
            started_at=obj.started_at,
            ended_at=obj.ended_at,
            created_at=obj.created_at,
            turns=[InterviewTurnResponse.model_validate(t) for t in (obj.turns or [])],
            report=FeedbackReportResponse.model_validate(obj.report) if obj.report else None,
        )


# ── Session create ────────────────────────────────────────────────────────────
class SessionCreateRequest(BaseModel):
    room_template_id: int


# ── Session start response ────────────────────────────────────────────────────
class SessionStartResponse(BaseModel):
    session: InterviewSessionDetailResponse
    livekit_token: str
    livekit_room_name: str
    livekit_url: str
