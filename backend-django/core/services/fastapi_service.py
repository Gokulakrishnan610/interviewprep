import requests
import asyncio
import aiohttp
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

    async def process_audio(self, session_id, audio_data, user_id):
        """Process audio data and return AI response"""
        try:
            # For now, return mock AI response
            # In production, this would call the actual FastAPI service
            return {
                'message': 'Thank you for your response. Can you tell me more about your experience with this technology?',
                'audio_data': None,  # Would contain base64 audio response
                'timestamp': '2024-01-01T00:00:00Z'
            }
        except Exception as e:
            print(f"Error processing audio: {str(e)}")
            return None

    async def get_interview_feedback(self, session_id, user_id):
        """Get interview feedback"""
        try:
            # For now, return mock feedback
            # In production, this would call the actual FastAPI service
            return {
                'overall_score': 85,
                'communication_score': 80,
                'technical_score': 90,
                'problem_solving_score': 85,
                'confidence_score': 80,
                'strengths': ['Good technical knowledge', 'Clear communication'],
                'areas_for_improvement': ['More specific examples', 'Better time management'],
                'detailed_feedback': 'Overall good performance with room for improvement in providing specific examples.',
                'recommendations': ['Practice with more real-world scenarios', 'Work on time management']
            }
        except Exception as e:
            print(f"Error getting interview feedback: {str(e)}")
            return None

fastapi_service = FastAPIService()