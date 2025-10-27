"""
LiveKit Router - Generate access tokens for LiveKit rooms
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from livekit import api
import os
from app.core.config import settings

router = APIRouter()

class TokenRequest(BaseModel):
    room_name: str
    participant_name: str

@router.post("/token")
async def get_livekit_token(request: TokenRequest):
    """
    Generate LiveKit access token for a participant to join a room
    """
    try:
        api_key = settings.LIVEKIT_API_KEY
        api_secret = settings.LIVEKIT_API_SECRET
        
        print(f"🔑 LiveKit API Key present: {bool(api_key)}")
        print(f"🔑 LiveKit API Secret present: {bool(api_secret)}")
        
        if not api_key or not api_secret:
            error_msg = f"LiveKit credentials not configured. API Key: {bool(api_key)}, Secret: {bool(api_secret)}"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Create access token
        print(f"🎫 Creating token for {request.participant_name} in room {request.room_name}")
        token = api.AccessToken(api_key, api_secret)
        
        # Set identity and name
        token.with_identity(request.participant_name)
        token.with_name(request.participant_name)
        
        # Grant permissions
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=request.room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))
        
        # Generate JWT
        jwt_token = token.to_jwt()
        
        print(f"✅ Generated LiveKit token for {request.participant_name} in room {request.room_name}")
        
        return {
            "token": jwt_token,
            "room_name": request.room_name,
            "participant_name": request.participant_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error generating LiveKit token: {e}")
        print(f"❌ Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to generate token: {str(e)}")

@router.get("/health")
async def livekit_health():
    """Health check for LiveKit service"""
    return {
        "status": "available",
        "livekit_configured": bool(os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET")),
        "livekit_url": os.getenv("LIVEKIT_URL")
    }
