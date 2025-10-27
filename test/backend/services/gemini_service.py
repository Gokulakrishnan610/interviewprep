import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging

# Set up logging
logger = logging.getLogger(__name__)
load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Conversation history for context
        self.conversation_history = []
        self.max_history = 10  # Keep last 10 exchanges

    async def generate_response(self, user_message: str) -> dict:
        """
        Generate a response using Gemini with conversation context
        """
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "parts": [user_message]})
            
            # Keep only recent history to manage token usage
            if len(self.conversation_history) > self.max_history * 2:
                self.conversation_history = self.conversation_history[-self.max_history * 2:]
            
            # Generate response
            response = self.model.generate_content(self.conversation_history)
            
            # Add assistant response to history
            self.conversation_history.append({"role": "model", "parts": [response.text]})
            
            return {
                "success": True,
                "response": response.text,
                "usage": {
                    "prompt_tokens": len(user_message),
                    "completion_tokens": len(response.text)
                }
            }
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {
                "success": False,
                "error": f"Gemini service error: {str(e)}",
                "response": "I'm having trouble responding right now. Please try again."
            }

    async def generate_response_without_history(self, user_message: str) -> dict:
        """
        Generate a response without maintaining conversation history
        """
        try:
            response = self.model.generate_content(user_message)
            
            return {
                "success": True,
                "response": response.text,
                "usage": {
                    "prompt_tokens": len(user_message),
                    "completion_tokens": len(response.text)
                }
            }
            
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {
                "success": False,
                "error": f"Gemini service error: {str(e)}",
                "response": "I'm having trouble responding right now. Please try again."
            }

    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        return {"success": True, "message": "Conversation history cleared"}

    def get_history_length(self):
        """Get current conversation history length"""
        return len(self.conversation_history)

# Create a global instance
gemini_service = GeminiService()