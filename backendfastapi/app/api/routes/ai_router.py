from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
import google.cloud.texttospeech as tts
import google.generativeai as genai
from app.core.config import settings
from app.services.audio import AudioService
from app.services.ai import AIService

router = APIRouter()
audio_service = AudioService()

def get_ai_service():
    return AIService()

class TranscribeRequest(BaseModel):
    audio_url: str
    language_code: str = "en-US"

class TTSRequest(BaseModel):
    text: str
    voice_name: str = "en-US-Standard-A"
    language_code: str = "en-US"

class InterviewFeedbackRequest(BaseModel):
    interview_text: str
    context: Optional[dict] = None

@router.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        transcript = await audio_service.transcribe_audio(
            request.audio_url,
            request.language_code
        )
        return {"text": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    try:
        audio_content = await audio_service.text_to_speech(
            request.text,
            request.voice_name,
            request.language_code
        )
        return {"audio_content": audio_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-interview")
async def analyze_interview(
    request: InterviewFeedbackRequest,
    ai_service: AIService = Depends(get_ai_service)
):
    try:
        feedback = await ai_service.analyze_interview(
            request.interview_text,
            request.context
        )
        return feedback
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sentiment-analysis")
async def analyze_sentiment(
    text: str,
    ai_service: AIService = Depends(get_ai_service)
):
    try:
        sentiment = await ai_service.analyze_sentiment(text)
        return {"sentiment": sentiment}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))