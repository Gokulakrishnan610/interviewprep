"""
Admin dependency — gates routes to users with is_admin=True.

Usage in route handlers:
    from app.core.admin_deps import get_admin_user
    ...
    current_user: User = Depends(get_admin_user)
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.models.user import User

_FORBIDDEN = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Admin access required.",
)


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_admin:
        raise _FORBIDDEN
    return current_user
