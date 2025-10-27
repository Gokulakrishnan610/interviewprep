from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import aiohttp
import asyncio
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize the router
router = APIRouter()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

@router.websocket("/listen")
async def deepgram_websocket(websocket: WebSocket):
    await websocket.accept()
    
    deepgram_url = f"wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&encoding=linear16&sample_rate=16000"
    headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(deepgram_url, headers=headers) as dg_ws:
                
                # Task to forward Deepgram messages to client
                async def forward_deepgram_to_client():
                    async for msg in dg_ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            await websocket.send_text(msg.data)
                
                # Start the forwarding task
                forward_task = asyncio.create_task(forward_deepgram_to_client())
                
                # Forward client audio to Deepgram
                while True:
                    data = await websocket.receive_bytes()
                    await dg_ws.send_bytes(data)
                    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Deepgram WebSocket error: {e}")
        await websocket.close(code=1011)

@router.get("/test")
async def test_deepgram():
    return {"message": "Deepgram router is working"}