"""
WebSocket JWT authentication.
HTTP endpoints use the HTTPBearer dependency.
WebSocket connections cannot set Authorization headers from the browser,
so the JWT is passed as a query parameter: ?token=<access_jwt>
This module extracts and validates the token, then loads the User from DB.
Returns the User ORM object or raises WebSocketException (4001/4003).
"""
from __future__ import annotations

import logging

from fastapi import WebSocket
from fastapi.websockets import WebSocketState
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token

logger = logging.getLogger(__name__)

# WebSocket close codes (matching standard practice)
WS_CLOSE_UNAUTHORIZED = 4001
WS_CLOSE_FORBIDDEN = 4003
WS_CLOSE_NOT_FOUND = 4004


async def get_ws_user(websocket: WebSocket, db: AsyncSession):
    """
    Extract Bearer token from ?token= query param, decode it,
    and return the active User ORM object.

    Closes the WebSocket with code 4001 and returns None on any auth failure.
    Caller must check for None and abort.
    """
    from app.repositories.user_repository import UserRepository  # late import

    token: str | None = websocket.query_params.get("token")

    if not token:
        logger.warning("WS auth: no token provided")
        await _close(websocket, WS_CLOSE_UNAUTHORIZED, "Authentication token required.")
        return None

    try:
        payload = decode_token(token)
    except JWTError as exc:
        logger.warning("WS auth: invalid token — %s", exc)
        await _close(websocket, WS_CLOSE_UNAUTHORIZED, "Invalid or expired token.")
        return None

    if payload.get("type") != "access":
        await _close(websocket, WS_CLOSE_UNAUTHORIZED, "Invalid token type.")
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        await _close(websocket, WS_CLOSE_UNAUTHORIZED, "Malformed token.")
        return None

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id_str))

    if not user or not user.is_active:
        await _close(websocket, WS_CLOSE_FORBIDDEN, "Account not found or inactive.")
        return None

    return user


async def _close(websocket: WebSocket, code: int, reason: str) -> None:
    """Accept then immediately close with an error code, so the client gets a reason."""
    try:
        if websocket.client_state == WebSocketState.CONNECTING:
            await websocket.accept()
        await websocket.close(code=code, reason=reason)
    except Exception:
        pass  # already closed or connection dropped