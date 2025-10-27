import requests
from django.conf import settings
from typing import Optional, Dict, Any

class FastAPIService:
    def __init__(self):
        self.base_url = settings.FASTAPI_URL

    def transcribe_audio(self, audio_url: str, language_code: str = "en-US") -> dict:
        endpoint = f"{self.base_url}/audio/transcribe"
        response = requests.post(endpoint, json={
            "audio_url": audio_url,
            "language_code": language_code
        })
        response.raise_for_status()
        return response.json()

    def text_to_speech(self, text: str, voice_name: str = "en-US-Standard-A") -> dict:
        endpoint = f"{self.base_url}/audio/tts"
        response = requests.post(endpoint, json={
            "text": text,
            "voice_name": voice_name
        })
        response.raise_for_status()
        return response.json()

    def analyze_interview(self, interview_text: str, context: Optional[Dict] = None) -> dict:
        endpoint = f"{self.base_url}/ai/analyze-interview"
        response = requests.post(endpoint, json={
            "interview_text": interview_text,
            "context": context
        })
        response.raise_for_status()
        return response.json()

    def generate_avatar(self, session_id: str, emotion: str = "neutral", text: Optional[str] = None) -> dict:
        endpoint = f"{self.base_url}/avatar/generate"
        response = requests.post(endpoint, json={
            "session_id": session_id,
            "emotion": emotion,
            "text": text
        })
        response.raise_for_status()
        return response.json()

    def animate_avatar(self, session_id: str, text: str, emotion: str = "neutral") -> dict:
        endpoint = f"{self.base_url}/avatar/animate"
        response = requests.post(endpoint, json={
            "session_id": session_id,
            "text": text,
            "emotion": emotion
        })
        response.raise_for_status()
        return response.json()

    def start_agent(self, room_name: str, agent_type: str = "interview", agent_id: Optional[str] = None) -> dict:
        endpoint = f"{self.base_url}/agents/start"
        response = requests.post(endpoint, json={
            "room_name": room_name,
            "agent_type": agent_type,
            "agent_id": agent_id
        })
        response.raise_for_status()
        return response.json()

fastapi_service = FastAPIService()