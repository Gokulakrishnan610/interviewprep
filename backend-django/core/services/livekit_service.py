import requests
import asyncio
import aiohttp
from django.conf import settings

class LiveKitService:
    def __init__(self):
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET
        self.api_url = settings.LIVEKIT_API_URL

    async def create_room(self, room_name, empty_timeout=300):
        """Create a LiveKit room and return connection info"""
        try:
            # For now, return mock LiveKit connection info
            # In production, you would integrate with actual LiveKit API
            return {
                'room_name': room_name,
                'token': f'mock_token_{room_name}',
                'url': self.api_url,
                'api_key': self.api_key
            }
        except Exception as e:
            print(f"Error creating LiveKit room: {str(e)}")
            return None

    def delete_room(self, room_name):
        """Delete a LiveKit room"""
        url = f"{self.api_url}/room/{room_name}"
        
        headers = {
            'Authorization': f'Bearer {self.api_key}:{self.api_secret}'
        }
        
        try:
            response = requests.delete(url, headers=headers)
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error deleting LiveKit room: {str(e)}")
            return False

    def get_room_participants(self, room_name):
        """Get list of participants in a room"""
        url = f"{self.api_url}/room/{room_name}/participants"
        
        headers = {
            'Authorization': f'Bearer {self.api_key}:{self.api_secret}'
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting room participants: {str(e)}")
            return []

livekit_service = LiveKitService()