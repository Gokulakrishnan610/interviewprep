from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class InterviewRoomTemplate(Base):
    """
    Reusable interview room definition.
    Admin-managed — users browse and select one to start a session against.
    """

    __tablename__ = "interview_room_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # ── Identity ──────────────────────────────────────────────────────────────
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # ── Classification ────────────────────────────────────────────────────────
    # company is blank for generic/role-based rooms
    company: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)

    # Stored as validated string; enum validation happens in the service layer.
    # Valid values: behavioral | technical | system_design | hr | mixed
    round_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Valid values: beginner | intermediate | advanced
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)

    # ── Session parameters ────────────────────────────────────────────────────
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    # ── AI interviewer persona ────────────────────────────────────────────────
    interviewer_name: Mapped[str] = mapped_column(String(100), default="Alex", nullable=False)
    interviewer_persona: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # ── JSON fields ───────────────────────────────────────────────────────────
    # competencies: list[str]
    # e.g. ["ownership", "impact", "conflict_resolution"]
    competencies: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    # rubric_dimensions: list[dict]
    # e.g. [{"dimension": "clarity", "description": "...", "max_score": 10}]
    rubric_dimensions: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    # String ref — SQLAlchemy resolves "InterviewSession" at mapper configuration time.
    sessions: Mapped[list] = relationship(
        "InterviewSession",
        back_populates="room_template",
        lazy="noload",  # never eager-load — rooms don't need session lists
    )

    def __repr__(self) -> str:
        return f"<RoomTemplate id={self.id} slug={self.slug!r}>"
