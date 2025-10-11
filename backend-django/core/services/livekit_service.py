import requests
from django.conf import settings

class LiveKitService:
    def __init__(self):
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET
        self.api_url = settings.LIVEKIT_API_URL

    def create_room(self, room_name, empty_timeout=300):
        """Create a LiveKit room"""
        url = f"{self.api_url}/room/create"
        
        headers = {
            'Authorization': f'Bearer {self.api_key}:{self.api_secret}'
        }
        
        data = {
            'name': room_name,
            'emptyTimeout': empty_timeout,
            'maxParticipants': 2  # Interviewer and interviewee
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            return response.json()
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