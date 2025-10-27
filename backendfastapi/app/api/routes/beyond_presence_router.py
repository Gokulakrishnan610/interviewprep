"""
Beyond Presence API Integration Router
Handles agent creation and call management
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os
import httpx
from datetime import datetime
from app.core.config import settings

router = APIRouter()

# Beyond Presence API Configuration
BEY_API_URL = settings.BEYOND_PRESENCE_API_URL
BEY_API_KEY = settings.BEY_API_KEY

class CreateAgentRequest(BaseModel):
    avatar_id: str
    livekit_token: str
    livekit_url: str
    name: Optional[str] = None
    system_prompt: Optional[str] = None

class CreateCallRequest(BaseModel):
    avatar_id: str
    livekit_url: str
    livekit_token: str
    language: str = "english"
    agent_id: Optional[str] = None

class AgentResponse(BaseModel):
    success: bool
    agent_id: Optional[str] = None
    message: Optional[str] = None
    data: Optional[dict] = None

@router.post("/create-agent")
async def create_beyond_presence_agent(request: CreateAgentRequest):
    """
    Create a Beyond Presence agent for a LiveKit room
    
    This initializes the Beyond Presence avatar in a LiveKit room
    """
    
    if not BEY_API_KEY:
        raise HTTPException(status_code=500, detail="BEY_API_KEY not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BEY_API_URL}/agent",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": BEY_API_KEY
                },
                json={
                    "name": request.name or "Interview Coach",
                    "system_prompt": request.system_prompt or (
                        "You are a professional interview coach. Ask the candidate thoughtful questions,"
                        " provide constructive feedback, and keep the conversation natural and supportive."
                    ),
                    "avatar_id": request.avatar_id,
                    "livekit_token": request.livekit_token,
                    "livekit_url": request.livekit_url
                },
                timeout=30.0
            )
            
            if response.status_code in (200, 201):
                data = response.json() if response.content else {}
                print(f"✅ Beyond Presence agent created: {data}")
                
                agent_id = None
                if isinstance(data, dict):
                    agent_id = data.get("agent_id") or data.get("id")

                return {
                    "success": True,
                    "agent_id": agent_id,
                    "data": data,
                    "message": "Agent created successfully"
                }
            else:
                print(f"❌ Beyond Presence API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail={
                        "message": "Beyond Presence API error",
                        "status_code": response.status_code,
                        "response": response.json() if response.content else response.text
                    }
                )
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Beyond Presence API timed out")
    except Exception as e:
        print(f"❌ Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")

@router.post("/create-call")
async def create_beyond_presence_call(request: CreateCallRequest):
    """
    Create a Beyond Presence call
    
    This starts a call session with the Beyond Presence avatar
    """
    
    if not BEY_API_KEY:
        raise HTTPException(status_code=500, detail="BEY_API_KEY not configured")
    
    try:
        print(f"➡️ Received call creation request: avatar_id={request.avatar_id}, agent_id={request.agent_id}, room_url={request.livekit_url}")
        async with httpx.AsyncClient() as client:
            payload = {k: v for k, v in {
                "avatar_id": request.avatar_id,
                "agent_id": request.agent_id,
                "livekit_url": request.livekit_url,
                "livekit_token": request.livekit_token,
                "language": request.language
            }.items() if v is not None}
            print(f"📤 Beyond Presence call payload: {payload}")

            response = await client.post(
                f"{BEY_API_URL}/calls",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": BEY_API_KEY
                },
                json=payload,
                timeout=30.0
            )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                print(f"✅ Beyond Presence call created: {data}")
                
                return {
                    "success": True,
                    "call_id": data.get("call_id"),
                    "data": data,
                    "message": "Call created successfully"
                }
            else:
                print(f"❌ Beyond Presence API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Beyond Presence API error: {response.text}"
                )
                
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Beyond Presence API timed out")
    except Exception as e:
        print(f"❌ Error creating call: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create call: {str(e)}")

@router.get("/health")
async def beyond_presence_health():
    """Health check for Beyond Presence integration"""
    return {
        "status": "available",
        "bey_api_configured": BEY_API_KEY is not None,
        "api_url": BEY_API_URL
    }

@router.post("/test-connection")
async def test_beyond_presence_connection():
    """Test connection to Beyond Presence API"""
    
    if not BEY_API_KEY:
        return {
            "success": False,
            "message": "BEY_API_KEY not configured"
        }
    
    try:
        async with httpx.AsyncClient() as client:
            # Try a simple request to verify API key
            response = await client.get(
                f"{BEY_API_URL}/avatars",  # Assuming this endpoint exists
                headers={
                    "x-api-key": BEY_API_KEY
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Connection successful",
                    "status_code": response.status_code
                }
            else:
                return {
                    "success": False,
                    "message": f"API returned status {response.status_code}",
                    "status_code": response.status_code
                }
                
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}"
        }
