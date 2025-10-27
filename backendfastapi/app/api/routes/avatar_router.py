from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from app.services.avatar import AvatarService
from app.services.beyond_presence import BeyondPresenceService

router = APIRouter()
avatar_service = AvatarService()
bp_service = BeyondPresenceService()

class AvatarRequest(BaseModel):
    session_id: str
    emotion: Optional[str] = "neutral"
    text: Optional[str] = None

class AvatarResponse(BaseModel):
    avatar_url: str
    animation_data: Optional[dict] = None

class StartCallRequest(BaseModel):
    avatar_id: str
    livekit_token: str
    livekit_url: Optional[str] = None
    text: Optional[str] = "Hello, let's begin the interview."

@router.post("/generate")
async def generate_avatar(request: AvatarRequest):
    try:
        avatar_data = await avatar_service.generate_avatar(
            request.session_id,
            request.emotion,
            request.text
        )
        return AvatarResponse(**avatar_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/animate")
async def animate_avatar(request: AvatarRequest):
    try:
        animation = await avatar_service.animate_avatar(
            request.session_id,
            request.text,
            request.emotion
        )
        return {"animation_data": animation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_avatar_session(session_id: str):
    try:
        session_data = await avatar_service.get_session(session_id)
        return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-call")
async def start_avatar_call(req: StartCallRequest):
    try:
        result = bp_service.start_call(
            avatar_id=req.avatar_id,
            text=req.text or "",
            livekit_token=req.livekit_token,
            livekit_url=req.livekit_url,
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to start call"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))