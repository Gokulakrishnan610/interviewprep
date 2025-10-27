# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# import os
# import sys
# from dotenv import load_dotenv

# # Add the current directory to Python path to fix imports
# sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# load_dotenv()

# app = FastAPI(title="AI Avatar Backend")

# # CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # In production, replace with your frontend URL
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Import and include routers
# try:
#     from routers.gemini_router import router as gemini_router
#     from routers.deepgram_router import router as deepgram_router  
#     from routers.beyond_presence_router import router as beyond_presence_router
#     from routers.livekit_router import router as livekit_router
    
#     # Include routers
#     app.include_router(gemini_router, prefix="/api/gemini", tags=["Gemini"])
#     app.include_router(deepgram_router, prefix="/api/deepgram", tags=["Deepgram"])
#     app.include_router(beyond_presence_router, prefix="/api/avatar", tags=["BeyondPresence"])
#     app.include_router(livekit_router, prefix="/api/livekit", tags=["LiveKit"])
    
#     print("✅ All routers loaded successfully!")
    
# except ImportError as e:
#     print(f"❌ Import error: {e}")
#     print("Please check that all router files exist and have no syntax errors.")

# @app.get("/")
# def root():
#     return {"message": "AI Avatar Backend Running 🚀"}

# @app.get("/health")
# def health_check():
#     return {"status": "healthy"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Avatar Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers.gemini_router import router as gemini_router
from routers.deepgram_router import router as deepgram_router  
from routers.beyond_presence_router import router as beyond_presence_router
from routers.livekit_router import router as livekit_router

# Include routers
app.include_router(gemini_router, prefix="/api/gemini", tags=["Gemini"])
app.include_router(deepgram_router, prefix="/api/deepgram", tags=["Deepgram"])
app.include_router(beyond_presence_router, prefix="/api/avatar", tags=["BeyondPresence"])
app.include_router(livekit_router, prefix="/api/livekit", tags=["LiveKit"])

print("✅ All routers loaded successfully!")

@app.get("/")
def root():
    return {"message": "AI Avatar Backend Running 🚀"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/test-all")
def test_all_routes():
    """Test that all routes are accessible"""
    return {
        "gemini": "/api/gemini/respond",
        "deepgram": "/api/deepgram/listen (WebSocket)",
        "beyond_presence": "/api/avatar/token",
        "livekit": "/api/livekit/token"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)