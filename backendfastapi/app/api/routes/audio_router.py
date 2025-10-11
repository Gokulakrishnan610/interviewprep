from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from pydantic import BaseModel
from app.services.audio import AudioService

router = APIRouter()
audio_service = AudioService()

class AudioProcessRequest(BaseModel):
    audio_url: str
    settings: Optional[dict] = None

@router.post("/process")
async def process_audio(file: UploadFile = File(...)):
    try:
        processed_audio = await audio_service.process_audio(file)
        return {"url": processed_audio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enhance")
async def enhance_audio(request: AudioProcessRequest):
    try:
        enhanced_audio = await audio_service.enhance_audio(
            request.audio_url,
            request.settings
        )
        return {"url": enhanced_audio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/convert")
async def convert_audio(
    file: UploadFile = File(...),
    format: str = "wav",
    sample_rate: int = 16000
):
    try:
        converted_audio = await audio_service.convert_audio(
            file,
            format,
            sample_rate
        )
        return {"url": converted_audio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))