from __future__ import annotations

import logging

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.integrations.smtp import send_verification_email
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserMeResponse,
)

logger = logging.getLogger(__name__)

# ── Exceptions (reusable HTTP errors) ─────────────────────────────────────────
_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password.",
    headers={"WWW-Authenticate": "Bearer"},
)
_ACCOUNT_INACTIVE = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Please verify your email address before logging in.",
)
_TOKEN_INVALID = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


# ── Service ───────────────────────────────────────────────────────────────────
class AuthService:
    """
    Owns all authentication and user-profile business logic.
    Receives a db session per request; instantiated in route handlers.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._repo = UserRepository(db)

    # ── Register ──────────────────────────────────────────────────────────────
    async def register(self, payload: RegisterRequest) -> dict:
        if await self._repo.email_exists(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        user = await self._repo.create(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            hashed_password=hash_password(payload.password),
            avatar_id=settings.DEFAULT_AVATAR_ID,
        )
        await self._repo.commit()

        # Issue tokens immediately (account inactive until verified)
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        # Send verification email (non-blocking failure)
        email_sent = await self._send_verification(user)

        return {
            "message": "Registration successful. Please check your email to verify your account.",
            "email_sent": email_sent,
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    # ── Login ─────────────────────────────────────────────────────────────────
    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self._repo.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise _INVALID_CREDENTIALS

        if not user.is_active:
            raise _ACCOUNT_INACTIVE

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    # ── Token refresh ─────────────────────────────────────────────────────────
    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            raise _TOKEN_INVALID

        if payload.get("type") != "refresh":
            raise _TOKEN_INVALID

        user_id = payload.get("sub")
        if not user_id:
            raise _TOKEN_INVALID

        user = await self._repo.get_by_id(int(user_id))
        if not user or not user.is_active:
            raise _TOKEN_INVALID

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    # ── Email verification ────────────────────────────────────────────────────
    async def verify_email(self, token: str) -> dict:
        try:
            payload = decode_token(token)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token.",
            )

        if payload.get("type") != "email_verify":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type.",
            )

        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed verification token.",
            )

        user = await self._repo.get_by_id(int(user_id))
        if not user or user.email != email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        if user.is_active:
            return {"message": "Email already verified."}

        await self._repo.activate(user)
        await self._repo.commit()

        return {
            "message": "Email verified successfully.",
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
        }

    async def resend_verification(self, email: str) -> dict:
        user = await self._repo.get_by_email(email)
        if not user:
            # Don't reveal whether the email exists
            return {"message": "If that email is registered, a verification link has been sent."}

        if user.is_active:
            return {"message": "Email already verified."}

        await self._send_verification(user)
        return {"message": "If that email is registered, a verification link has been sent."}

    # ── Current user ──────────────────────────────────────────────────────────
    async def get_me(self, user_id: int) -> UserMeResponse:
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return UserMeResponse.model_validate(user)

    async def update_me(self, user_id: int, payload: UpdateProfileRequest) -> UserMeResponse:
        user = await self._repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        await self._repo.update_profile(
            user,
            first_name=payload.first_name,
            last_name=payload.last_name,
            bio=payload.bio,
            preferred_language=payload.preferred_language,
            skill_level=payload.skill_level,
        )
        await self._repo.commit()
        return UserMeResponse.model_validate(user)

    # ── Private helpers ───────────────────────────────────────────────────────
    async def _send_verification(self, user: User) -> bool:
        token = create_email_verification_token(user.id, user.email)
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        return await send_verification_email(
            to_email=user.email,
            to_name=f"{user.first_name} {user.last_name}".strip(),
            verification_url=verification_url,
        )
