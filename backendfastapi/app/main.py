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
from app.api.routes import ai_router, audio_router, avatar_router, auth, realtime, agent_router

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(ai_router.router, prefix="/ai", tags=["AI Services"])
app.include_router(audio_router.router, prefix="/audio", tags=["Audio Processing"])
app.include_router(avatar_router.router, prefix="/avatar", tags=["Avatar Services"])
app.include_router(realtime.router, prefix="/ws", tags=["WebSocket"])
app.include_router(agent_router.router, prefix="/agents", tags=["Agent Management"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to Interview Prep AI API",
        "version": settings.VERSION,
        "status": "active"
    }