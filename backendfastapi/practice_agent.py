"""
Practice Mode Agent - Uses Gemini 2.5 Flash, Deepgram, and ElevenLabs
This is a Python implementation for the FastAPI backend
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load practice mode environment variables
load_dotenv('.env.practice')

class PracticeAgent:
    def __init__(self):
        """Initialize practice mode agent with Gemini, Deepgram, and ElevenLabs"""
        
        # Configure Gemini 2.5 Flash
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.llm = genai.GenerativeModel('gemini-2.0-flash-exp')
            print("✅ Gemini 2.5 Flash configured")
        else:
            raise ValueError("GEMINI_API_KEY not found in .env.practice")
        
        # Deepgram configuration (for Speech-to-Text)
        self.deepgram_api_key = os.getenv('DEEPGRAM_API_KEY')
        if self.deepgram_api_key:
            print("✅ Deepgram API key loaded")
        else:
            print("⚠️ DEEPGRAM_API_KEY not found")
        
        # ElevenLabs configuration (for Text-to-Speech)
        self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')
        if self.elevenlabs_api_key:
            print("✅ ElevenLabs API key loaded")
        else:
            print("⚠️ ELEVENLABS_API_KEY not found")
        
        # Practice mode instructions
        self.instructions = """
        You are Priya, a friendly and professional AI interview coach.
        
        Your role:
        - Conduct practice interviews for various positions
        - Ask relevant technical and behavioral questions
        - Provide constructive feedback
        - Help candidates improve their interview skills
        - Be encouraging and supportive
        
        Interview style:
        - Start with introductions
        - Ask about experience and background
        - Progress to role-specific questions
        - Include behavioral questions (STAR method)
        - End with candidate questions
        
        Keep responses conversational and natural.
        """
    
    async def generate_response(self, conversation_history: list) -> str:
        """
        Generate AI response using Gemini 2.5 Flash
        
        Args:
            conversation_history: List of messages with 'role' and 'content'
        
        Returns:
            AI-generated response text
        """
        try:
            # Format conversation for Gemini
            prompt = self.instructions + "\n\nConversation:\n"
            for msg in conversation_history:
                role = "Interviewer" if msg['role'] == 'assistant' else "Candidate"
                prompt += f"{role}: {msg['content']}\n"
            
            prompt += "\nInterviewer:"
            
            # Generate response
            response = self.llm.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"❌ Error generating response: {e}")
            return "I apologize, I'm having trouble responding right now. Could you please repeat that?"
    
    async def transcribe_audio(self, audio_data: bytes) -> str:
        """
        Transcribe audio using Deepgram
        
        Args:
            audio_data: Audio bytes to transcribe
        
        Returns:
            Transcribed text
        """
        try:
            # Deepgram API call would go here
            # For now, return placeholder
            print("🎤 Transcribing audio with Deepgram...")
            
            # TODO: Implement Deepgram API call
            # from deepgram import Deepgram
            # dg_client = Deepgram(self.deepgram_api_key)
            # response = await dg_client.transcription.prerecorded({'buffer': audio_data, 'mimetype': 'audio/wav'})
            # return response['results']['channels'][0]['alternatives'][0]['transcript']
            
            return "[Audio transcription placeholder]"
            
        except Exception as e:
            print(f"❌ Error transcribing audio: {e}")
            return ""
    
    async def synthesize_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
        """
        Convert text to speech using ElevenLabs
        
        Args:
            text: Text to convert to speech
            voice_id: ElevenLabs voice ID (default: Rachel)
        
        Returns:
            Audio bytes
        """
        try:
            print(f"🔊 Synthesizing speech with ElevenLabs...")
            
            # TODO: Implement ElevenLabs API call
            # import requests
            # url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            # headers = {
            #     "Accept": "audio/mpeg",
            #     "Content-Type": "application/json",
            #     "xi-api-key": self.elevenlabs_api_key
            # }
            # data = {
            #     "text": text,
            #     "model_id": "eleven_monolingual_v1",
            #     "voice_settings": {
            #         "stability": 0.5,
            #         "similarity_boost": 0.5
            #     }
            # }
            # response = requests.post(url, json=data, headers=headers)
            # return response.content
            
            return b""  # Placeholder
            
        except Exception as e:
            print(f"❌ Error synthesizing speech: {e}")
            return b""
    
    async def conduct_interview(self, position: str = "Backend Developer") -> dict:
        """
        Start a practice interview session
        
        Args:
            position: Job position to interview for
        
        Returns:
            Interview session data
        """
        initial_message = f"""Hello! I'm Priya, your dedicated AI interview coach, and I'm excited to help you prepare for your {position} interview. Let's make sure you're ready to ace that interview!

To start, could you tell me a bit about yourself and your experience?"""
        
        return {
            "session_id": f"practice_{os.urandom(8).hex()}",
            "position": position,
            "initial_message": initial_message,
            "status": "active"
        }


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_practice_agent():
        agent = PracticeAgent()
        
        # Test interview start
        session = await agent.conduct_interview("Backend Developer")
        print(f"\n🎯 Session: {session['session_id']}")
        print(f"📝 Initial message: {session['initial_message']}")
        
        # Test response generation
        conversation = [
            {"role": "assistant", "content": session['initial_message']},
            {"role": "user", "content": "Hi! I'm Gokul. I have 3 years of experience in backend development with Python and FastAPI."}
        ]
        
        response = await agent.generate_response(conversation)
        print(f"\n🤖 AI Response: {response}")
    
    asyncio.run(test_practice_agent())
