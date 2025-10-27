import os
import requests
import logging
from dotenv import load_dotenv
from typing import Optional, Dict, Any

# Set up logging
logger = logging.getLogger(__name__)
load_dotenv()

class BeyondPresenceService:
    def __init__(self):
        self.api_key = os.getenv("BEYOND_PRESENCE_API_KEY")
        if not self.api_key:
            raise ValueError("BEYOND_PRESENCE_API_KEY not found in environment variables")
        
        self.base_url = "https://api.beyondpresence.ai/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def get_access_token(self) -> Dict[str, Any]:
        """
        Get access token from Beyond Presence API
        """
        try:
            response = requests.post(
                f"{self.base_url}/auth/token",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                return {
                    "success": True,
                    "access_token": token_data.get("access_token"),
                    "expires_in": token_data.get("expires_in"),
                    "token_type": token_data.get("token_type")
                }
            else:
                logger.error(f"Beyond Presence token error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Beyond Presence token request failed: {str(e)}")
            return {
                "success": False,
                "error": f"Token request failed: {str(e)}"
            }

    async def make_avatar_speak(self, avatar_id: str, text: str, livekit_token: str, 
                              livekit_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Make an avatar speak text through LiveKit
        """
        try:
            if not livekit_url:
                livekit_url = os.getenv("LIVEKIT_URL")
            
            payload = {
                "avatar_id": avatar_id,
                "text": text,
                "livekit_url": livekit_url,
                "livekit_token": livekit_token
            }

            response = requests.post(
                f"{self.base_url}/calls",
                json=payload,
                headers=self.headers,
                timeout=30  # 30 second timeout
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "call_id": result.get("call_id"),
                    "status": result.get("status"),
                    "message": "Avatar speech initiated successfully"
                }
            else:
                logger.error(f"Beyond Presence speak error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API returned {response.status_code}: {response.text}",
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            logger.error("Beyond Presence API timeout")
            return {
                "success": False,
                "error": "Request timeout - Beyond Presence API is not responding"
            }
        except Exception as e:
            logger.error(f"Beyond Presence speak request failed: {str(e)}")
            return {
                "success": False,
                "error": f"Speak request failed: {str(e)}"
            }

    async def get_avatar_status(self, call_id: str) -> Dict[str, Any]:
        """
        Check the status of an avatar call
        """
        try:
            response = requests.get(
                f"{self.base_url}/calls/{call_id}",
                headers=self.headers
            )

            if response.status_code == 200:
                status_data = response.json()
                return {
                    "success": True,
                    "status": status_data.get("status"),
                    "call_data": status_data
                }
            else:
                return {
                    "success": False,
                    "error": f"Status check failed: {response.status_code}",
                    "status_code": response.status_code
                }

        except Exception as e:
            logger.error(f"Avatar status check failed: {str(e)}")
            return {
                "success": False,
                "error": f"Status check failed: {str(e)}"
            }

    async def stop_avatar_speech(self, call_id: str) -> Dict[str, Any]:
        """
        Stop an ongoing avatar speech
        """
        try:
            response = requests.delete(
                f"{self.base_url}/calls/{call_id}",
                headers=self.headers
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Avatar speech stopped successfully"
                }
            else:
                return {
                    "success": False,
                    "error": f"Stop request failed: {response.status_code}",
                    "status_code": response.status_code
                }

        except Exception as e:
            logger.error(f"Stop avatar speech failed: {str(e)}")
            return {
                "success": False,
                "error": f"Stop request failed: {str(e)}"
            }

    async def list_available_avatars(self) -> Dict[str, Any]:
        """
        Get list of available avatars
        """
        try:
            response = requests.get(
                f"{self.base_url}/avatars",
                headers=self.headers
            )

            if response.status_code == 200:
                avatars_data = response.json()
                return {
                    "success": True,
                    "avatars": avatars_data.get("avatars", []),
                    "count": len(avatars_data.get("avatars", []))
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to fetch avatars: {response.status_code}",
                    "status_code": response.status_code
                }

        except Exception as e:
            logger.error(f"Failed to fetch avatars: {str(e)}")
            return {
                "success": False,
                "error": f"Avatar list request failed: {str(e)}"
            }

# Create a global instance
beyond_presence_service = BeyondPresenceService()