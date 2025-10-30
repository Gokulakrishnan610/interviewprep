from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Interview Prep AI API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # Database
    DATABASE_URL: str = "sqlite:///./interview_ai.db"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000"  # Django backend
    ]
    
    # LiveKit
    LIVEKIT_URL: str = "wss://interviewapp-86itzjcd.livekit.cloud"
    LIVEKIT_API_KEY: str = "APIabMqmQ8P4aRx"
    LIVEKIT_API_SECRET: str = "BrhWkwtTeBmYqeMIXEOqpnQFhG3Vvkfz3bffOezzKJQK"
    
    # AI Services
    GOOGLE_API_KEY: str = "AIzaSyDpi8YH0O1sCzoUH6CvebacwhQ1c_pSAqM"
    DEEPGRAM_API_KEY: str = "d0f20e29bcccbf7b5ba7cf6b777f4e7e822e37b2"
    GOOGLE_CLOUD_PROJECT_ID: str = "your-google-cloud-project-id"
    GOOGLE_CLOUD_CREDENTIALS_FILE: str = "path/to/credentials.json"
    
    # Beyond Presence
    BEYOND_PRESENCE_API_KEY: str = "sk-s5MCPaFRud95-L5GtYuk0Alo-393BL6l58vUr3BqVjY"
    BEYOND_PRESENCE_API_URL: str = "https://api.bey.dev/v1"
    
    # Hugging Face
    HUGGING_FACE_API_KEY: str = "your-huggingface-api-key"
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Gemini API
    GEMINI_API_KEY: str = "AIzaSyDpi8YH0O1sCzoUH6CvebacwhQ1c_pSAqM"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TEMPERATURE: float = 0.8
    
    # ElevenLabs API
    ELEVENLABS_API_KEY: str = "sk_2f8bf57e574bf7374e2c5fc6f71678a0352367eb307f3cc3"
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL: str = "eleven_monolingual_v1"
    
    # Beyond Presence
    BEY_AVATAR_ID: str = "694c83e2-8895-4a98-bd16-56332ca3f449"
    BEY_API_KEY: str = "sk-s5MCPaFRud95-L5GtYuk0Alo-393BL6l58vUr3BqVjY"
    
    # Deepgram
    DEEPGRAM_MODEL: str = "nova-2"
    DEEPGRAM_LANGUAGE: str = "en-US"
    
    # Mode
    MODE: str = "production"
    
    # Gmail API OAuth
    GMAIL_CLIENT_ID: str = "666662207936-j9c2bolugep2lnadjoh7r6guuodusjii.apps.googleusercontent.com"
    GMAIL_CLIENT_SECRET: str = "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"
    GMAIL_REDIRECT_URI: str = "http://localhost:8002/api/gmail/oauth-callback"
    GMAIL_TOKEN_FILE: str = "gmail_token.json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Allow extra fields from .env

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)