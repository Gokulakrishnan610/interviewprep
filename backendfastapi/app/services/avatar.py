from app.core.config import settings
import aiohttp
import json

class AvatarService:
    def __init__(self):
        self.api_key = settings.BEYOND_PRESENCE_API_KEY
        self.base_url = settings.BEYOND_PRESENCE_API_URL

    async def generate_avatar(self, session_id: str, emotion: str = "neutral", text: str = None):
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "session_id": session_id,
                    "emotion": emotion,
                    "text": text
                }
                
                async with session.post(
                    f"{self.base_url}/avatar/generate",
                    headers=headers,
                    json=data
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Avatar generation failed: {await response.text()}")
                    
                    result = await response.json()
                    return {
                        "avatar_url": result["avatar_url"],
                        "animation_data": result.get("animation_data")
                    }
        except Exception as e:
            raise Exception(f"Avatar generation failed: {str(e)}")

    async def animate_avatar(self, session_id: str, text: str, emotion: str = "neutral"):
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                data = {
                    "session_id": session_id,
                    "text": text,
                    "emotion": emotion
                }
                
                async with session.post(
                    f"{self.base_url}/avatar/animate",
                    headers=headers,
                    json=data
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Avatar animation failed: {await response.text()}")
                    
                    return await response.json()
        except Exception as e:
            raise Exception(f"Avatar animation failed: {str(e)}")

    async def get_session(self, session_id: str):
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                async with session.get(
                    f"{self.base_url}/avatar/session/{session_id}",
                    headers=headers
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Failed to get session: {await response.text()}")
                    
                    return await response.json()
        except Exception as e:
            raise Exception(f"Failed to get session: {str(e)}")