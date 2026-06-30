from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
def _now() -> datetime:
    return datetime.now(timezone.utc)
# ── InterviewSession ───────────────────────────────────────────────────────────
class InterviewSession(Base):
    """
    One interview attempt: one user × one room template.
    Lifecycle: scheduled → in_progress → completed | cancelled.
    """
    __tablename__ = "interview_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # ── Ownership ─────────────────────────────────────────────────────────────
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_template_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("interview_room_templates.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # ── State ─────────────────────────────────────────────────────────────────
    # Valid values: scheduled | in_progress | completed | cancelled
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)
    # LiveKit room — empty until session is started
    livekit_room_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    # ── Timestamps ────────────────────────────────────────────────────────────
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped[Any] = relationship(
        "User", back_populates="sessions", lazy="noload"
    )
    room_template: Mapped[Any] = relationship(
        "InterviewRoomTemplate", back_populates="sessions", lazy="selectin"
    )
    turns: Mapped[list[InterviewTurn]] = relationship(
        "InterviewTurn",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewTurn.turn_number",
        lazy="selectin",
    )
    report: Mapped[FeedbackReport | None] = relationship(
        "FeedbackReport",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    def __repr__(self) -> str:
        return f"<InterviewSession id={self.id} status={self.status!r}>"
# ── InterviewTurn ──────────────────────────────────────────────────────────────
class InterviewTurn(Base):
    """
    A single question-answer exchange within a session.
    Written by the WS conductor (Phase 4) as the interview progresses.
    """
    __tablename__ = "interview_turns"
    __table_args__ = (
        UniqueConstraint("session_id", "turn_number", name="uq_turn_session_number"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    # AI side — set when question is posed
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    asked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # User side — populated as the answer arrives
    answer_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    answer_audio_url: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # ── Relationship ──────────────────────────────────────────────────────────
    session: Mapped[InterviewSession] = relationship(
        "InterviewSession", back_populates="turns"
    )
    def __repr__(self) -> str:
        return f"<InterviewTurn session={self.session_id} turn={self.turn_number}>"
# ── FeedbackReport ─────────────────────────────────────────────────────────────
class FeedbackReport(Base):
    """
    Final AI-generated scorecard for a completed session.
    One-to-one with InterviewSession; written by the AI service after analysis.
    """
    __tablename__ = "feedback_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Mirrors room_template.rubric_dimensions keys
    # e.g. {"clarity": 8, "structure": 7, "ownership": 9}
    dimension_scores: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    # JSON lists of strings
    strengths: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    weaknesses: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    recommendations: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # Raw Gemini response — preserved for debugging / re-processing
    raw_ai_response: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    # ── Relationship ──────────────────────────────────────────────────────────
    session: Mapped[InterviewSession] = relationship(
        "InterviewSession", back_populates="report"
    )
    def __repr__(self) -> str:
        return f"<FeedbackReport session={self.session_id} score={self.overall_score}>"