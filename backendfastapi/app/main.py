from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI Interview Service — WebSocket interview conductor",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only the real-time interview WebSocket is served here.
# Auth, users, sessions, and reports live in the Django backend.
from app.api.routes import realtime

app.include_router(realtime.router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    return {
        "service": "AI Interview Service",
        "version": settings.VERSION,
        "status": "active",
    }
