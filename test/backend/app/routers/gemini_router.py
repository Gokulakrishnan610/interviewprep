from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json

router = APIRouter()

# Import service with error handling
try:
    from app.services.gemini_service import gemini_service
    print("✅ Gemini router: Service imported successfully")
except ImportError as e:
    print(f"❌ Gemini router: Service import failed: {e}")
    gemini_service = None

@router.post("/start-interview")
async def start_interview(position: str = "Software Engineer"):
    if not gemini_service:
        raise HTTPException(status_code=503, detail="Gemini service not configured")
    
    try:
        response = await gemini_service.start_interview(position)
        return {"response": response, "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat_with_gemini(message: str):
    if not gemini_service:
        raise HTTPException(status_code=503, detail="Gemini service not configured")
    
    try:
        response = await gemini_service.send_message(message)
        return {"response": response, "success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat-stream")
async def chat_stream(message: str):
    if not gemini_service:
        raise HTTPException(status_code=503, detail="Gemini service not configured")
    
    async def generate():
        async for chunk in gemini_service.stream_response(message):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/plain")

@router.get("/health")
async def health_check():
    return {"status": "available" if gemini_service else "unavailable"}