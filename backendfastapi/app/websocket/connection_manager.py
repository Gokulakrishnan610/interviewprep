"""
ConnectionManager — in-process registry of active WebSocket connections.

Keyed by session_id (int).  One session → one active socket.

Design notes:
- Single-process safe.  For multi-worker deployments this would need
  a Redis pub/sub fanout layer; the session_state.py Redis store
  already provides the shared persistent layer between workers.
- Disconnect is idempotent — safe to call multiple times.
"""
from __future__ import annotations

import logging
from typing import Dict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # session_id → WebSocket
        self._active: Dict[int, WebSocket] = {}

    # ── Connection lifecycle ──────────────────────────────────────────────────

    async def connect(self, session_id: int, websocket: WebSocket) -> None:
        """Accept the WebSocket and register it. Closes any stale duplicate."""
        existing = self._active.get(session_id)
        if existing is not None:
            logger.warning(
                "Replacing stale WebSocket for session %s (likely page refresh)", session_id
            )
            await self._close_quietly(existing)

        await websocket.accept()
        self._active[session_id] = websocket
        logger.info("WebSocket connected: session=%s", session_id)

    def disconnect(self, session_id: int) -> None:
        """Remove session from registry (does NOT close the socket)."""
        self._active.pop(session_id, None)
        logger.info("WebSocket disconnected: session=%s", session_id)

    def is_connected(self, session_id: int) -> bool:
        return session_id in self._active

    # ── Send helpers ──────────────────────────────────────────────────────────

    async def send_json(self, session_id: int, data: dict) -> None:
        """Send a JSON message to one session. No-op if not connected."""
        ws = self._active.get(session_id)
        if ws is None:
            return
        try:
            await ws.send_json(data)
        except Exception as exc:
            logger.warning("send_json failed for session %s: %s", session_id, exc)
            self.disconnect(session_id)

    # ── Internal ──────────────────────────────────────────────────────────────

    @staticmethod
    async def _close_quietly(ws: WebSocket) -> None:
        try:
            await ws.close()
        except Exception:
            pass


# Module-level singleton — imported by interview_ws.py
manager = ConnectionManager()
