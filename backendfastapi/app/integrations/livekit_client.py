"""
LiveKit integration — server-side token generation.

Wraps the `livekit-api` SDK's AccessToken builder so the rest of the
codebase never imports livekit directly.

Usage
-----
    from app.integrations.livekit_client import LiveKitClient
    client = LiveKitClient()
    token = client.create_join_token(user_id=42, display_name="Alice", room_name="interview-abc")
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class LiveKitClient:
    """
    Thin wrapper around livekit-api AccessToken.

    Token generation is synchronous (pure crypto, no I/O) so no async needed.
    """

    def __init__(self) -> None:
        self._api_key = settings.LIVEKIT_API_KEY
        self._api_secret = settings.LIVEKIT_API_SECRET
        self._url = settings.LIVEKIT_URL

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_secret)

    def create_join_token(
        self,
        *,
        user_id: int,
        display_name: str,
        room_name: str,
        can_publish: bool = True,
        can_subscribe: bool = True,
    ) -> str:
        """
        Return a signed JWT that grants the participant permission to join
        the given LiveKit room.

        Falls back to a placeholder string if the SDK is not installed or
        credentials are not configured — services handle the fallback downstream.
        """
        if not self.is_configured():
            logger.warning("LiveKit credentials not configured — returning placeholder token")
            return f"lk-unconfigured-{room_name}"

        try:
            from livekit.api import AccessToken, VideoGrants  # type: ignore[import]

            grants = VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
            )
            token = (
                AccessToken(
                    api_key=self._api_key,
                    api_secret=self._api_secret,
                )
                .with_identity(str(user_id))
                .with_name(display_name)
                .with_grants(grants)
            )
            return token.to_jwt()

        except ImportError:
            logger.warning("livekit-api package not installed — returning placeholder token")
            return f"lk-no-sdk-{room_name}"
        except Exception as exc:
            logger.error("LiveKit token generation failed: %s", exc)
            return f"lk-error-{room_name}"

    @property
    def server_url(self) -> str:
        return self._url
