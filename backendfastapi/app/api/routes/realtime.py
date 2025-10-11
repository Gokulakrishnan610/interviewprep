from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from app.services.avatar import AvatarService
from app.services.audio import AudioService
from app.services.ai import AIService
from typing import Dict
import json

router = APIRouter()
avatar_service = AvatarService()
audio_service = AudioService()
ai_service = AIService()

# Store active connections
active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_connections[session_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data["type"] == "audio":
                # Process audio and return transcription
                transcription = await audio_service.transcribe_audio(data["audio_url"])
                await websocket.send_json({
                    "type": "transcription",
                    "text": transcription
                })
                
                # Analyze response with AI
                analysis = await ai_service.analyze_interview(transcription)
                await websocket.send_json({
                    "type": "analysis",
                    "result": analysis
                })
                
                # Generate avatar response
                avatar_response = await avatar_service.generate_avatar(
                    session_id=session_id,
                    emotion=analysis.get("emotion", "neutral"),
                    text=analysis.get("response")
                )
                await websocket.send_json({
                    "type": "avatar",
                    "data": avatar_response
                })
                
            elif data["type"] == "end_session":
                # Generate final analysis and cleanup
                final_analysis = await ai_service.analyze_interview(
                    data["interview_text"],
                    complete=True
                )
                await websocket.send_json({
                    "type": "final_analysis",
                    "result": final_analysis
                })
                break
                
    except WebSocketDisconnect:
        if session_id in active_connections:
            del active_connections[session_id]
    
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
        if session_id in active_connections:
            del active_connections[session_id]