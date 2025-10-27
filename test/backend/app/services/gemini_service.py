# import google.generativeai as genai
# import asyncio
# from typing import AsyncGenerator
# from app.config import config

# class GeminiService:
#     def __init__(self):
#         if not config.GEMINI_API_KEY:
#             raise ValueError("GEMINI_API_KEY not configured")
            
#         genai.configure(api_key=config.GEMINI_API_KEY)
#         self.model = genai.GenerativeModel('gemini-pr')
#         self.chat = None
#         self.interview_context = """
#         You are an AI interviewer for a tech company. Your role is to conduct professional interviews.
#         Be engaging, ask relevant follow-up questions, and assess candidates appropriately.
#         Keep responses concise and natural for voice conversation (max 2-3 sentences).
#         """

#     async def start_interview(self, position: str = "Software Engineer"):
#         """Initialize interview with specific position"""
#         position_context = f"""
#         {self.interview_context}
#         You are interviewing for the position: {position}
#         Start with a friendly greeting and ask about their background and interest in this role.
#         """
#         self.chat = self.model.start_chat(history=[])
#         response = await asyncio.get_event_loop().run_in_executor(
#             None, 
#             lambda: self.chat.send_message(position_context)
#         )
#         return response.text

#     async def send_message(self, message: str) -> str:
#         """Send message to Gemini and get response"""
#         if not self.chat:
#             self.chat = self.model.start_chat(history=[])
        
#         try:
#             response = await asyncio.get_event_loop().run_in_executor(
#                 None, 
#                 lambda: self.chat.send_message(message)
#             )
#             return response.text
#         except Exception as e:
#             return f"I apologize, but I encountered an error. Could you please repeat that?"

#     async def stream_response(self, message: str) -> AsyncGenerator[str, None]:
#         """Stream response from Gemini"""
#         if not self.chat:
#             self.chat = self.model.start_chat(history=[])
        
#         try:
#             response = await asyncio.get_event_loop().run_in_executor(
#                 None, 
#                 lambda: self.chat.send_message(message, stream=True)
#             )
            
#             for chunk in response:
#                 yield chunk.text
#         except Exception as e:
#             yield "I apologize, but I encountered an error."

# try:
#     gemini_service = GeminiService()
# except Exception as e:
#     print(f"Warning: Gemini service initialization failed: {e}")
#     gemini_service = None

import os
import asyncio
from typing import AsyncGenerator

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Import here to avoid global import if API key is missing
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        self.genai = genai
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.chat = None
        self.interview_context = """
        You are an AI interviewer for a tech company. Your role is to conduct professional interviews.
        Be engaging, ask relevant follow-up questions, and assess candidates appropriately.
        Keep responses concise and natural for voice conversation (max 2-3 sentences).
        """

    async def start_interview(self, position: str = "Software Engineer"):
        """Initialize interview with specific position"""
        position_context = f"""
        {self.interview_context}
        You are interviewing for the position: {position}
        Start with a friendly greeting and ask about their background and interest in this role.
        """
        self.chat = self.model.start_chat(history=[])
        response = await asyncio.get_event_loop().run_in_executor(
            None, 
            lambda: self.chat.send_message(position_context)
        )
        return response.text

    async def send_message(self, message: str) -> str:
        """Send message to Gemini and get response"""
        if not self.chat:
            self.chat = self.model.start_chat(history=[])
        
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.chat.send_message(message)
            )
            return response.text
        except Exception as e:
            return f"I apologize, but I encountered an error. Could you please repeat that?"

    async def stream_response(self, message: str) -> AsyncGenerator[str, None]:
        """Stream response from Gemini"""
        if not self.chat:
            self.chat = self.model.start_chat(history=[])
        
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.chat.send_message(message, stream=True)
            )
            
            for chunk in response:
                yield chunk.text
        except Exception as e:
            yield "I apologize, but I encountered an error."
    
    async def generate_content(self, prompt: str) -> str:
        """Generate content from Gemini without chat history"""
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            return response.text
        except Exception as e:
            raise Exception(f"Failed to generate content: {str(e)}")

# Create service instance with error handling
try:
    gemini_service = GeminiService()
    print("✅ Gemini service initialized successfully!")
except Exception as e:
    print(f"❌ Gemini service initialization failed: {e}")
    gemini_service = None