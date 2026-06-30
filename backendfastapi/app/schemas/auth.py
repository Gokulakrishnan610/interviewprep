from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Shared sub-schema ─────────────────────────────────────────────────────────
class UserProfileSchema(BaseModel):
    bio: str = ""
    preferred_language: str = "en"
    interview_credits: int = 0
    skill_level: str = "beginner"

    model_config = {"from_attributes": True}


# ── Register ──────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def strip_names(self) -> RegisterRequest:
        self.first_name = self.first_name.strip()
        self.last_name = self.last_name.strip()
        return self


class RegisterResponse(BaseModel):
    message: str
    email_sent: bool
    # Tokens are returned so the frontend can immediately store them,
    # but the account stays inactive until email is verified.
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

    model_config = {"from_attributes": True}


# ── Login ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

    model_config = {"from_attributes": True}


# ── Token refresh ─────────────────────────────────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str


# ── Email verification ────────────────────────────────────────────────────────
class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


# ── Current user (me) ─────────────────────────────────────────────────────────
class UserMeResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    is_email_verified: bool
    avatar_id: str
    profile: UserProfileSchema | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Profile update ────────────────────────────────────────────────────────────
class UpdateProfileRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    preferred_language: str | None = Field(default=None, max_length=10)
    skill_level: str | None = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
