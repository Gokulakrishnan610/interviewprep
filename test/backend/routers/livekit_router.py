from fastapi import APIRouter
import os
from datetime import timedelta
from dotenv import load_dotenv
import time
import jwt

load_dotenv()

# Initialize the router
router = APIRouter()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_SECRET = os.getenv("LIVEKIT_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

@router.get("/token")
async def get_livekit_token(identity: str = "user"):
    try:
        # Try to import livekit, but handle if it's not available
        try:
            from livekit import api
            has_livekit = True
        except ImportError:
            has_livekit = False
            print("⚠️ LiveKit package not installed. Using mock tokens.")

        # If we have real LiveKit credentials and package, generate a real token
        if has_livekit and LIVEKIT_API_KEY and LIVEKIT_SECRET and LIVEKIT_API_KEY != "your_livekit_api_key_here":
            token = api.AccessToken(
                api_key=LIVEKIT_API_KEY,
                api_secret=LIVEKIT_SECRET,
                identity=identity
            )
            token.add_grant(api.VideoGrant(
                room_join=True,
                room="avatar-room",
                can_publish=True,
                can_subscribe=True
            ))
            jwt_token = token.to_jwt(ttl=timedelta(hours=2))
            
            return {
                "token": jwt_token,
                "url": LIVEKIT_URL,
                "success": True,
                "is_real": True
            }
        else:
            # Generate a mock token for development
            mock_payload = {
                'sub': identity,
                'iss': LIVEKIT_API_KEY or 'mock_api_key',
                'nbf': int(time.time()),
                'exp': int(time.time()) + 7200,  # 2 hours
                'video': {'room': 'avatar-room', 'room_join': True}
            }
            
            # Simple mock token without proper JWT signing
            mock_token = f"mock_token_{identity}_{int(time.time())}"
            
            return {
                "token": mock_token,
                "url": LIVEKIT_URL or "ws://localhost:7880",
                "success": True,
                "is_real": False,
                "note": "This is a mock token for development. Install 'livekit-api' package for real tokens."
            }
    
    except Exception as e:
        return {
            "error": f"LiveKit token error: {str(e)}",
            "success": False
        }

@router.get("/test")
async def test_livekit():
    return {
        "message": "LiveKit router is working",
        "has_livekit_package": False,  # Change to True after installing livekit-api
        "instruction": "Run 'pip install livekit-api' for real token generation"
    }