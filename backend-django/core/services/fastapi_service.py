import requests
from django.conf import settings

class FastAPIService:
    def __init__(self):
        self.base_url = settings.FASTAPI_URL

    def initialize_interview(self, user_id, interview_id, interview_type, difficulty_level):
        """Initialize an interview session with the AI backend"""
        url = f"{self.base_url}/interviews/initialize"
        data = {
            'user_id': user_id,
            'interview_id': interview_id,
            'type': interview_type,
            'difficulty': difficulty_level
        }
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error initializing interview: {str(e)}")
            return None

    def process_response(self, interview_id, question, response, audio_url=None):
        """Process an interview response"""
        url = f"{self.base_url}/interviews/{interview_id}/process-response"
        data = {
            'question': question,
            'response': response,
            'audio_url': audio_url
        }
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error processing response: {str(e)}")
            return None

    def analyze_interview(self, interview_id):
        """Get final analysis of an interview"""
        url = f"{self.base_url}/interviews/{interview_id}/analyze"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error analyzing interview: {str(e)}")
            return None

fastapi_service = FastAPIService()