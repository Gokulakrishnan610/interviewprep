from fastapi import APIRouter, HTTPException

router = APIRouter()

# Import service with error handling
try:
    from app.services.livekit_service import livekit_service
    print("✅ LiveKit router: Service imported successfully")
except ImportError as e:
    print(f"❌ LiveKit router: Service import failed: {e}")
    livekit_service = None

@router.post("/create-token/agent")
async def create_agent_token(room_name: str, identity: str):
    if not livekit_service:
        raise HTTPException(status_code=503, detail="LiveKit service not configured")
    
    try:
        token = livekit_service.create_agent_token(room_name, identity)
        return {
            "success": True,
            "token": token,
            "livekit_url": livekit_service.livekit_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-token/user")
async def create_user_token(room_name: str, identity: str):
    if not livekit_service:
        raise HTTPException(status_code=503, detail="LiveKit service not configured")
    
    try:
        token = livekit_service.create_user_token(room_name, identity)
        return {
            "success": True,
            "token": token,
            "livekit_url": livekit_service.livekit_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-room")
async def create_room(room_name: str):
    if not livekit_service:
        raise HTTPException(status_code=503, detail="LiveKit service not configured")
    
    try:
        result = livekit_service.create_room(room_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def livekit_health():
    return {"status": "available" if livekit_service else "unavailable"}