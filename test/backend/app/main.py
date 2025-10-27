from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

app = FastAPI(
    title="AI Avatar Interview Room API",
    description="Backend for AI-powered interview room with LiveKit and Beyond Presence",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Validate configuration on startup"""
    try:
        # Check if required environment variables exist
        required_vars = [
            "GEMINI_API_KEY",
            "DEEPGRAM_API_KEY", 
            "BEYOND_API_KEY",
            "LIVEKIT_API_KEY",
            "LIVEKIT_API_SECRET",
            "LIVEKIT_URL"
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
            print("Some features may not work properly. Please check your .env file")
        else:
            print("✅ All environment variables are properly configured!")
            
    except Exception as e:
        print(f"⚠️  Configuration warning: {e}")

# Import and include routers after the app is created
try:
    from app.routers import gemini_router, deepgram_router, beyond_presence_router, livekit_router, interview_router
    
    app.include_router(gemini_router.router, prefix="/api/gemini", tags=["gemini"])
    app.include_router(deepgram_router.router, prefix="/api/deepgram", tags=["deepgram"])
    app.include_router(beyond_presence_router.router, prefix="/api/beyond", tags=["beyond-presence"])
    app.include_router(livekit_router.router, prefix="/api/livekit", tags=["livekit"])
    app.include_router(interview_router.router, prefix="/api/interview", tags=["interview"])
    print("✅ All routers loaded successfully!")
    
except ImportError as e:
    print(f"❌ Error loading routers: {e}")

@app.get("/")
async def root():
    return {
        "message": "AI Avatar Interview Room API",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    services_status = {
        "gemini": bool(os.getenv("GEMINI_API_KEY")),
        "deepgram": bool(os.getenv("DEEPGRAM_API_KEY")),
        "beyond_presence": bool(os.getenv("BEYOND_API_KEY")),
        "livekit": bool(os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET")),
        "avatar": bool(os.getenv("AVATAR_ID"))
    }
    
    return {
        "status": "healthy",
        "services": services_status
    }

@app.get("/config")
async def get_config_status():
    """Endpoint to check configuration status"""
    return {
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "deepgram_configured": bool(os.getenv("DEEPGRAM_API_KEY")),
        "beyond_configured": bool(os.getenv("BEYOND_API_KEY")),
        "livekit_configured": bool(os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET")),
        "livekit_url": os.getenv("LIVEKIT_URL"),
        "avatar_id": os.getenv("AVATAR_ID", "Not configured")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )