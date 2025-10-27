import os
import aiohttp
import json
import logging
from dotenv import load_dotenv

# Set up logging
logger = logging.getLogger(__name__)
load_dotenv()

class DeepgramService:
    def __init__(self):
        self.api_key = os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables")
        
        self.base_url = "wss://api.deepgram.com/v1/listen"
        self.headers = {
            "Authorization": f"Token {self.api_key}",
        }

    def get_connection_url(self, options: dict = None) -> str:
        """
        Generate Deepgram WebSocket URL with options
        """
        default_options = {
            "model": "nova-2",
            "punctuate": "true",
            "encoding": "linear16",
            "sample_rate": "16000",
            "channels": "1",
            "interim_results": "true",
            "endpointing": "true",
            "vad_turnoff": "500"
        }
        
        if options:
            default_options.update(options)
        
        params = "&".join([f"{k}={v}" for k, v in default_options.items()])
        return f"{self.base_url}?{params}"

    async def create_websocket_connection(self, session: aiohttp.ClientSession, options: dict = None):
        """
        Create a WebSocket connection to Deepgram
        """
        try:
            url = self.get_connection_url(options)
            ws = await session.ws_connect(url, headers=self.headers)
            logger.info("Deepgram WebSocket connection established")
            return ws
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {str(e)}")
            raise e

    async def process_audio_chunk(self, websocket: aiohttp.ClientSession, audio_data: bytes):
        """
        Send audio data to Deepgram for processing
        """
        try:
            await websocket.send_bytes(audio_data)
        except Exception as e:
            logger.error(f"Error sending audio to Deepgram: {str(e)}")
            raise e

    def parse_transcript(self, message_data: dict) -> dict:
        """
        Parse Deepgram response and extract transcript
        """
        try:
            if not message_data:
                return {"success": False, "transcript": ""}
            
            # Check if we have a transcript in the response
            transcript = message_data.get('channel', {}).get('alternatives', [{}])[0].get('transcript', '')
            is_final = message_data.get('is_final', False)
            confidence = message_data.get('channel', {}).get('alternatives', [{}])[0].get('confidence', 0)
            
            return {
                "success": True,
                "transcript": transcript.strip(),
                "is_final": is_final,
                "confidence": confidence,
                "raw_response": message_data
            }
        except Exception as e:
            logger.error(f"Error parsing Deepgram response: {str(e)}")
            return {
                "success": False,
                "transcript": "",
                "error": str(e)
            }

    async def transcribe_audio_file(self, audio_file_path: str) -> dict:
        """
        Transcribe an audio file using Deepgram
        """
        try:
            url = "https://api.deepgram.com/v1/listen"
            params = {
                "model": "nova-2",
                "punctuate": "true",
                "diarize": "true"
            }
            
            headers = {
                "Authorization": f"Token {self.api_key}",
            }
            
            async with aiohttp.ClientSession() as session:
                with open(audio_file_path, 'rb') as audio_file:
                    form_data = aiohttp.FormData()
                    form_data.add_field('audio', audio_file, filename='audio.wav', content_type='audio/wav')
                    
                    async with session.post(url, data=form_data, headers=headers, params=params) as response:
                        if response.status == 200:
                            result = await response.json()
                            transcript = result.get('results', {}).get('channels', [{}])[0].get('alternatives', [{}])[0].get('transcript', '')
                            
                            return {
                                "success": True,
                                "transcript": transcript,
                                "raw_response": result
                            }
                        else:
                            error_text = await response.text()
                            return {
                                "success": False,
                                "error": f"Deepgram API error: {response.status} - {error_text}"
                            }
                            
        except Exception as e:
            logger.error(f"Error transcribing audio file: {str(e)}")
            return {
                "success": False,
                "error": f"Transcription error: {str(e)}"
            }

# Create a global instance
deepgram_service = DeepgramService()