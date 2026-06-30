from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# ── Helpers ───────────────────────────────────────────────────────────────────
_DEFAULT_AVATAR_ID = "694c83e2-8895-4a98-bd16-56332ca3f449"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Identity
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    # username mirrors email by default; kept for display purposes
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Avatar / profile picture
    profile_picture: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_id: Mapped[str] = mapped_column(
        String(100), nullable=False, default=_DEFAULT_AVATAR_ID
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    # Relationships
    profile: Mapped[UserProfile] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",  # always load profile alongside user
    )

    # Added in later phases:
    # sessions: Mapped[list[InterviewSession]] = relationship(...)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


# ── UserProfile ───────────────────────────────────────────────────────────────
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    bio: Mapped[str] = mapped_column(Text, default="", nullable=False)
    preferred_language: Mapped[str] = mapped_column(
        String(10), default="en", nullable=False
    )
    interview_credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skill_level: Mapped[str] = mapped_column(
        String(20), default="beginner", nullable=False
    )

    # Relationship
    user: Mapped[User] = relationship("User", back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile user_id={self.user_id} skill={self.skill_level!r}>"
