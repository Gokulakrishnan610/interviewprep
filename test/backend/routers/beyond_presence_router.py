from fastapi import APIRouter, HTTPException
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize the router
router = APIRouter()

BEYOND_PRESENCE_API_KEY = os.getenv("BEYOND_PRESENCE_API_KEY")

@router.get("/token")
async def get_avatar_token():
    try:
        # Mock response since we don't have the actual Beyond Presence API details
        # In production, replace this with actual API call
        return {
            "success": True,
            "access_token": "mock_beyond_presence_token",
            "message": "This is a mock token. Replace with actual Beyond Presence API call."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token request failed: {str(e)}")

@router.post("/speak")
async def avatar_speak(data: dict):
    try:
        avatar_id = data.get("avatar_id", "default")
        text = data.get("text", "")
        livekit_token = data.get("livekit_token")
        
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        
        # Mock response - replace with actual Beyond Presence API call
        return {
            "success": True,
            "message": f"Avatar would speak: '{text}'",
            "call_id": "mock_call_id",
            "note": "Replace with actual Beyond Presence API integration"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Avatar speak failed: {str(e)}")

@router.get("/test")
async def test_beyond_presence():
    return {"message": "Beyond Presence router is working"}