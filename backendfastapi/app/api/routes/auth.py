from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserMeResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _svc(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Tiny factory — keeps route signatures clean."""
    return AuthService(db)


# ── Register ──────────────────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
async def register(
    payload: RegisterRequest,
    svc: AuthService = Depends(_svc),
) -> RegisterResponse:
    result = await svc.register(payload)
    return RegisterResponse(**result)


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain access + refresh tokens",
)
async def login(
    payload: LoginRequest,
    svc: AuthService = Depends(_svc),
) -> TokenResponse:
    return await svc.login(payload)


# ── Token refresh ─────────────────────────────────────────────────────────────
@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange refresh token for new token pair",
)
async def refresh(
    payload: RefreshRequest,
    svc: AuthService = Depends(_svc),
) -> TokenResponse:
    return await svc.refresh(payload.refresh_token)


# ── Email verification ────────────────────────────────────────────────────────
@router.post(
    "/verify-email",
    summary="Verify email address with token from email link",
)
async def verify_email(
    payload: VerifyEmailRequest,
    svc: AuthService = Depends(_svc),
) -> dict:
    return await svc.verify_email(payload.token)


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend the email verification link",
)
async def resend_verification(
    payload: ResendVerificationRequest,
    svc: AuthService = Depends(_svc),
) -> MessageResponse:
    result = await svc.resend_verification(payload.email)
    return MessageResponse(**result)


# ── Current user ──────────────────────────────────────────────────────────────
@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Get the authenticated user's profile",
)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    svc = AuthService(db)
    return await svc.get_me(current_user.id)


@router.patch(
    "/me",
    response_model=UserMeResponse,
    summary="Partial update of name and profile fields",
)
async def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserMeResponse:
    svc = AuthService(db)
    return await svc.update_me(current_user.id, payload)
