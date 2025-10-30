from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI Features API for Interview Preparation Platform"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from app.api.routes import ai_router, audio_router, avatar_router, auth, realtime, interview_router, practice_router, beyond_presence_router, livekit_router

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(ai_router.router, prefix="/ai", tags=["AI Services"])
app.include_router(audio_router.router, prefix="/audio", tags=["Audio Processing"])
app.include_router(avatar_router.router, prefix="/avatar", tags=["Avatar Services"])
app.include_router(realtime.router, prefix="/ws", tags=["WebSocket"])
app.include_router(interview_router.router, prefix="/api/interview", tags=["Interview"])
app.include_router(practice_router.router, prefix="/api/practice", tags=["Practice Mode"])
app.include_router(beyond_presence_router.router, prefix="/api/beyond-presence", tags=["Beyond Presence"])
app.include_router(livekit_router.router, prefix="/api/livekit", tags=["LiveKit"])

# Gmail router (optional - requires google-api-python-client, google-auth, google-auth-oauthlib)
try:
    from app.api.routes import gmail_router
    app.include_router(gmail_router.router, prefix="/api/gmail", tags=["Gmail"])
    print("✅ Gmail router loaded")
except ImportError as e:
    print(f"⚠️ Gmail router not available: {e}")
    print("   Install: pip install google-api-python-client google-auth google-auth-oauthlib")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Interview Prep AI API",
        "version": settings.VERSION,
        "status": "active"
    }