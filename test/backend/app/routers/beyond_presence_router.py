from fastapi import APIRouter, HTTPException

router = APIRouter()

# Import service with error handling
try:
    from app.services.beyond_presence_service import beyond_presence_service
    print("✅ Beyond Presence router: Service imported successfully")
except ImportError as e:
    print(f"❌ Beyond Presence router: Service import failed: {e}")
    beyond_presence_service = None

@router.post("/start-call")
async def start_avatar_call(livekit_url: str, livekit_token: str, language: str = "english"):
    if not beyond_presence_service:
        raise HTTPException(status_code=503, detail="Beyond Presence service not configured")
    
    try:
        result = await beyond_presence_service.start_avatar_call(livekit_url, livekit_token, language)
        return {"success": True, "call_id": result.get("call_id"), "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/end-call/{call_id}")
async def end_avatar_call(call_id: str):
    if not beyond_presence_service:
        raise HTTPException(status_code=503, detail="Beyond Presence service not configured")
    
    try:
        result = await beyond_presence_service.end_avatar_call(call_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/call-status/{call_id}")
async def get_call_status(call_id: str):
    if not beyond_presence_service:
        raise HTTPException(status_code=503, detail="Beyond Presence service not configured")
    
    try:
        result = await beyond_presence_service.get_avatar_status(call_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def beyond_health():
    return {"status": "available" if beyond_presence_service else "unavailable"}