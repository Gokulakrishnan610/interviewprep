import asyncio
import json
import websockets
from app.config import config
from typing import AsyncGenerator, Callable, Optional

class DeepgramService:
    def __init__(self):
        self.api_key = config.DEEPGRAM_API_KEY
        self.sample_rate = 16000
        self.channels = 1
        self.encoding = "linear16"

    async def transcribe_audio_stream(
        self, 
        audio_stream: AsyncGenerator[bytes, None],
        on_transcription: Callable[[str], None]
    ) -> None:
        """Transcribe audio stream using Deepgram"""
        if not self.api_key:
            raise ValueError("Deepgram API key not configured")
            
        deepgram_url = f"wss://api.deepgram.com/v1/listen?encoding={self.encoding}&sample_rate={self.sample_rate}&channels={self.channels}&interim_results=true"
        
        headers = {
            "Authorization": f"Token {self.api_key}"
        }

        try:
            async with websockets.connect(deepgram_url, extra_headers=headers) as ws:
                # Start receiving and sending audio
                async def receive_transcriptions():
                    async for message in ws:
                        data = json.loads(message)
                        transcript = data.get('channel', {}).get('alternatives', [{}])[0].get('transcript', '')
                        if transcript.strip():
                            on_transcription(transcript)
                
                # Send audio data
                async def send_audio():
                    async for audio_chunk in audio_stream:
                        if ws.open:
                            await ws.send(audio_chunk)
                
                # Run both tasks concurrently
                await asyncio.gather(
                    receive_transcriptions(),
                    send_audio()
                )
                
        except Exception as e:
            print(f"Deepgram transcription error: {e}")
            raise

    async def transcribe_audio_file(self, audio_data: bytes) -> str:
        """Transcribe audio file using Deepgram"""
        import aiohttp
        
        if not self.api_key:
            raise ValueError("Deepgram API key not configured")
            
        url = "https://api.deepgram.com/v1/listen"
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/wav"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, data=audio_data) as response:
                if response.status == 200:
                    result = await response.json()
                    return result['results']['channels'][0]['alternatives'][0]['transcript']
                else:
                    error_text = await response.text()
                    raise Exception(f"Deepgram API error: {error_text}")

# Create service instance but don't raise error on import
try:
    deepgram_service = DeepgramService()
except Exception as e:
    print(f"Warning: Deepgram service initialization failed: {e}")
    deepgram_service = None