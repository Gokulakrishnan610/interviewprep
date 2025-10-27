from fastapi import APIRouter
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

# Initialize the router
router = APIRouter()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_SECRET = os.getenv("LIVEKIT_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

@router.get("/token")
async def get_livekit_token(identity: str = "user"):
    try:
        # Mock token generation - replace with actual LiveKit token generation
        # In production, use: from livekit import api
        return {
            "token": "mock_livekit_token",
            "url": LIVEKIT_URL or "ws://localhost:7880",
            "success": True,
            "note": "Replace with actual LiveKit token generation"
        }
    
    except Exception as e:
        return {
            "error": f"LiveKit token error: {str(e)}",
            "success": False
        }

@router.get("/test")
async def test_livekit():
    return {"message": "LiveKit router is working"}