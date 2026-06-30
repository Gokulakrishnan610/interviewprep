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
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./interview_ai.db"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 1
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 60 * 24
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://localhost:8002"
    ]

    FRONTEND_URL: str = "http://localhost:3000"
    DEFAULT_FROM_EMAIL: str = "noreply@interviewprep.local"
    DEFAULT_AVATAR_ID: str = "694c83e2-8895-4a98-bd16-56332ca3f449"
    
    # LiveKit
    LIVEKIT_URL: str = "wss://your-livekit-instance.livekit.cloud"
    LIVEKIT_API_KEY: str = "your-api-key"
    LIVEKIT_API_SECRET: str = "your-api-secret"
    
    # AI Services
    GOOGLE_API_KEY: str = "your-google-api-key"
    DEEPGRAM_API_KEY: str = "your-deepgram-api-key"
    GOOGLE_CLOUD_PROJECT_ID: str = "your-google-cloud-project-id"
    GOOGLE_CLOUD_CREDENTIALS_FILE: str = "path/to/credentials.json"
    
    # Beyond Presence
    BEYOND_PRESENCE_API_KEY: str = "your-beyond-presence-api-key"
    BEYOND_PRESENCE_API_URL: str = "https://api.beyondpresence.com/v1"
    
    # Hugging Face
    HUGGING_FACE_API_KEY: str = "your-huggingface-api-key"
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Create upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
