import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    BEYOND_API_KEY = os.getenv("BEYOND_API_KEY")
    LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
    LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
    LIVEKIT_URL = os.getenv("LIVEKIT_URL")
    AVATAR_ID = os.getenv("AVATAR_ID")
    
    @classmethod
    def validate(cls):
        """Validate that all required environment variables are set"""
        required_vars = {
            "GEMINI_API_KEY": cls.GEMINI_API_KEY,
            "DEEPGRAM_API_KEY": cls.DEEPGRAM_API_KEY,
            "BEYOND_API_KEY": cls.BEYOND_API_KEY,
            "LIVEKIT_API_KEY": cls.LIVEKIT_API_KEY,
            "LIVEKIT_API_SECRET": cls.LIVEKIT_API_SECRET,
            "LIVEKIT_URL": cls.LIVEKIT_URL,
        }
        
        missing_vars = [var for var, value in required_vars.items() if not value]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

config = Config()