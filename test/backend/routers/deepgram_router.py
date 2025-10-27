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
    print("🔊 Deepgram WebSocket connection initiated")
    
    # Check if API key is available
    if not DEEPGRAM_API_KEY or DEEPGRAM_API_KEY == "your_deepgram_api_key_here":
        error_msg = "Deepgram API key not configured. Please add DEEPGRAM_API_KEY to your .env file"
        print(f"❌ {error_msg}")
        await websocket.send_text(json.dumps({
            "error": error_msg,
            "type": "configuration_error"
        }))
        await websocket.close(code=1011)
        return
    
    deepgram_ws = None
    try:
        # Deepgram connection URL with parameters
        deepgram_url = f"wss://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&encoding=linear16&sample_rate=16000&interim_results=true"
        headers = {"Authorization": f"Token {DEEPGRAM_API_KEY}"}
        
        print("🔄 Connecting to Deepgram API...")
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(deepgram_url, headers=headers) as dg_ws:
                deepgram_ws = dg_ws
                print("✅ Connected to Deepgram API")
                
                # Send connection success message to client
                await websocket.send_text(json.dumps({
                    "type": "connected",
                    "message": "Successfully connected to Deepgram"
                }))

                # Task to forward Deepgram messages to client
                async def forward_deepgram_to_client():
                    try:
                        async for msg in dg_ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                # Parse and send transcript to client
                                try:
                                    data = json.loads(msg.data)
                                    # Only send meaningful transcripts
                                    transcript = data.get('channel', {}).get('alternatives', [{}])[0].get('transcript', '')
                                    if transcript and data.get('is_final', False):
                                        await websocket.send_text(json.dumps({
                                            "type": "transcript",
                                            "transcript": transcript,
                                            "is_final": True,
                                            "raw": data
                                        }))
                                    else:
                                        # Send interim results for debugging
                                        await websocket.send_text(msg.data)
                                except json.JSONDecodeError:
                                    await websocket.send_text(msg.data)
                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                print(f"❌ Deepgram WebSocket error: {msg.data}")
                                break
                    except Exception as e:
                        print(f"❌ Error in Deepgram forwarding: {e}")
                
                # Start the forwarding task
                forward_task = asyncio.create_task(forward_deepgram_to_client())
                
                try:
                    # Forward client audio to Deepgram
                    while True:
                        data = await websocket.receive_bytes()
                        if dg_ws.closed:
                            break
                        await dg_ws.send_bytes(data)
                        
                except WebSocketDisconnect:
                    print("ℹ️ Client disconnected from Deepgram WebSocket")
                except Exception as e:
                    print(f"❌ Error in audio forwarding: {e}")
                finally:
                    # Cancel the forwarding task and close connection
                    if not forward_task.done():
                        forward_task.cancel()
                        try:
                            await forward_task
                        except asyncio.CancelledError:
                            pass
                    
    except aiohttp.ClientError as e:
        error_msg = f"Failed to connect to Deepgram: {str(e)}"
        print(f"❌ {error_msg}")
        await websocket.send_text(json.dumps({
            "error": error_msg,
            "type": "connection_error"
        }))
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"❌ {error_msg}")
        await websocket.send_text(json.dumps({
            "error": error_msg,
            "type": "unexpected_error"
        }))
    finally:
        if deepgram_ws and not deepgram_ws.closed:
            await deepgram_ws.close()
        await websocket.close()
        print("🔌 Deepgram WebSocket connection closed")

@router.get("/test")
async def test_deepgram():
    """Test Deepgram configuration"""
    if not DEEPGRAM_API_KEY or DEEPGRAM_API_KEY == "your_deepgram_api_key_here":
        return {
            "success": False,
            "message": "Deepgram API key not configured. Add DEEPGRAM_API_KEY to your .env file",
            "required_action": "configure_api_key"
        }
    
    return {
        "success": True,
        "message": "Deepgram is configured",
        "next_step": "Test WebSocket connection at /api/deepgram/listen"
    }

@router.get("/config")
async def get_deepgram_config():
    """Get Deepgram configuration status"""
    has_api_key = bool(DEEPGRAM_API_KEY and DEEPGRAM_API_KEY != "your_deepgram_api_key_here")
    
    return {
        "api_key_configured": has_api_key,
        "websocket_endpoint": "/api/deepgram/listen",
        "status": "ready" if has_api_key else "needs_configuration"
    }