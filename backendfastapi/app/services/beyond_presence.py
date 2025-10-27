import os
import requests
from typing import Optional, Dict, Any
from app.core.config import settings

class BeyondPresenceService:
    def __init__(self):
        self.api_key = settings.BEYOND_PRESENCE_API_KEY
        self.base_url = settings.BEYOND_PRESENCE_API_URL.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def start_call(self, avatar_id: str, text: str, livekit_token: str, livekit_url: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not livekit_url:
                livekit_url = settings.LIVEKIT_URL

            payload = {
                "avatar_id": avatar_id,
                "text": text,
                "livekit_url": livekit_url,
                "livekit_token": livekit_token
            }
            resp = requests.post(f"{self.base_url}/calls", json=payload, headers=self.headers, timeout=30)
            if resp.status_code == 200:
                return {"success": True, **resp.json()}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def stop_call(self, call_id: str) -> Dict[str, Any]:
        try:
            resp = requests.delete(f"{self.base_url}/calls/{call_id}", headers=self.headers, timeout=15)
            if resp.status_code == 200:
                return {"success": True, **resp.json()}
            return {"success": False, "status_code": resp.status_code, "error": resp.text}
        except Exception as e:
            return {"success": False, "error": str(e)}
