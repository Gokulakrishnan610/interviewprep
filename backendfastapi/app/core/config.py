from __future__ import annotations

from typing import List

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Interview Prep AI"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ── Server ───────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # ── Database (async PostgreSQL) ───────────────────────────────────────────
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@host/db

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── Frontend ──────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── Email (SMTP) ─────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    DEFAULT_FROM_EMAIL: str = "noreply@interviewprep.local"
    DEFAULT_FROM_NAME: str = "Interview Prep AI"

    # ── LiveKit ───────────────────────────────────────────────────────────────
    LIVEKIT_URL: str = "wss://your-livekit-instance.livekit.cloud"
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GOOGLE_API_KEY: str = ""

    # ── Deepgram ──────────────────────────────────────────────────────────────
    DEEPGRAM_API_KEY: str = ""

    # ── Azure Speech (TTS fallback) ───────────────────────────────────────────
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "centralindia"
    AZURE_TTS_VOICE: str = "en-US-JennyNeural"

    # ── Beyond Presence (avatar) ──────────────────────────────────────────────
    BEYOND_PRESENCE_API_KEY: str = ""
    BEYOND_PRESENCE_API_URL: str = "https://api.bey.dev/v1"

    # ── Hugging Face ──────────────────────────────────────────────────────────
    HUGGING_FACE_API_KEY: str = ""
    HF_ZERO_SHOT_MODEL: str = "facebook/bart-large-mnli"
    HF_API_BASE_URL: str = "https://api-inference.huggingface.co/models"

    # ── Avatar defaults ───────────────────────────────────────────────────────
    DEFAULT_AVATAR_ID: str = "694c83e2-8895-4a98-bd16-56332ca3f449"

    # ── File uploads ─────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10


settings = Settings()
