import os
import time
from livekit import api
from typing import Optional

class LiveKitService:
    def __init__(self):
        self.api_key = os.getenv("LIVEKIT_API_KEY")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET")
        self.livekit_url = os.getenv("LIVEKIT_URL")
        
        if not all([self.api_key, self.api_secret, self.livekit_url]):
            raise ValueError("LiveKit environment variables not properly configured")

    def create_agent_token(self, room_name: str, identity: str) -> str:
        """Create token for AI agent"""
        grant = api.VideoGrant(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_publish_sources=["microphone", "camera"],
            hidden=True,
            agent=True
        )
        
        token = api.AccessToken(self.api_key, self.api_secret, identity=identity, grant=grant)
        return token.to_jwt()

    def create_user_token(self, room_name: str, identity: str) -> str:
        """Create token for user"""
        grant = api.VideoGrant(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        )
        
        token = api.AccessToken(self.api_key, self.api_secret, identity=identity, grant=grant)
        return token.to_jwt()

    def create_room(self, room_name: str, empty_timeout: int = 300) -> dict:
        """Create a new room"""
        livekit = api.LiveKitAPI(self.livekit_url, self.api_key, self.api_secret)
        
        try:
            room = livekit.room.create_room(
                name=room_name,
                empty_timeout=empty_timeout,
                max_participants=10
            )
            return {"success": True, "room": room}
        except Exception as e:
            return {"success": False, "error": str(e)}

livekit_service = LiveKitService()