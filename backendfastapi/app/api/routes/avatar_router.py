from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from app.services.avatar import AvatarService

router = APIRouter()
avatar_service = AvatarService()

class AvatarRequest(BaseModel):
    session_id: str
    emotion: Optional[str] = "neutral"
    text: Optional[str] = None

class AvatarResponse(BaseModel):
    avatar_url: str
    animation_data: Optional[dict] = None

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