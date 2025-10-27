from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import json

router = APIRouter()

# Import service with error handling
try:
    from app.services.deepgram_service import deepgram_service
    print("✅ Deepgram router: Service imported successfully")
except ImportError as e:
    print(f"❌ Deepgram router: Service import failed: {e}")
    deepgram_service = None

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_transcription(self, transcription: str):
        for connection in self.active_connections:
            await connection.send_text(json.dumps({
                "type": "transcription",
                "text": transcription
            }))

manager = ConnectionManager()

@router.websocket("/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    if not deepgram_service:
        await websocket.close(code=1008, reason="Deepgram service not configured")
        return
        
    await manager.connect(websocket)
    
    try:
        async def on_transcription(transcript: str):
            await manager.send_transcription(transcript)
        
        async def audio_generator():
            while True:
                data = await websocket.receive_bytes()
                yield data
        
        await deepgram_service.transcribe_audio_stream(audio_generator(), on_transcription)
        
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@router.get("/health")
async def deepgram_health():
    return {"status": "available" if deepgram_service else "unavailable"}