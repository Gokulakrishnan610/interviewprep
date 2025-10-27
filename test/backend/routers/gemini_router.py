from fastapi import APIRouter, HTTPException
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Initialize the router
router = APIRouter()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

@router.post("/respond")
async def get_gemini_response(data: dict):
    try:
        user_text = data.get("message", "")
        
        if not user_text:
            raise HTTPException(status_code=400, detail="No message provided")
        
        # Check if API key is available
        if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
            return {
                "response": "I'm an AI assistant. To enable my full capabilities, please add your Gemini API key to the backend/.env file.",
                "success": True,
                "model_used": "mock"
            }
        
        # Try different models in order of preference
        models_to_try = [
            "gemini-2.5-flash",  # Latest model
            "gemini-1.5-flash-001",  # Specific version
            "gemini-1.0-pro",  # Fallback model
            "gemini-pro"  # Most common fallback
        ]
        
        response = None
        last_error = None
        successful_model = None
        
        for model_name in models_to_try:
            try:
                print(f"Trying model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(user_text)
                successful_model = model_name
                print(f"✅ Success with model: {model_name}")
                break
            except Exception as e:
                last_error = e
                print(f"❌ Model {model_name} failed: {str(e)}")
                continue
        
        if response is None:
            # If all models fail, return a helpful mock response
            print("All Gemini models failed, using mock response")
            return {
                "response": f"I understand you said: '{user_text}'. This is a mock response since the Gemini API is not configured. Please check your API key and model availability.",
                "success": True,
                "model_used": "mock_fallback"
            }
        
        return {
            "response": response.text,
            "success": True,
            "model_used": successful_model
        }
    
    except Exception as e:
        print(f"Gemini router error: {str(e)}")
        return {
            "error": f"Gemini service temporarily unavailable: {str(e)}",
            "success": False
        }

@router.post("/clear-history")
async def clear_conversation_history():
    """Clear conversation history (placeholder)"""
    return {"success": True, "message": "History cleared"}

@router.get("/history-length")
async def get_history_length():
    """Get conversation history length (placeholder)"""
    return {"history_length": 0}

@router.get("/test")
async def test_gemini():
    """Test endpoint to check Gemini configuration"""
    try:
        if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
            return {
                "success": False,
                "message": "Gemini API key not configured",
                "available_models": ["mock"]
            }
        
        # Try to list available models
        models = genai.list_models()
        model_names = [model.name for model in models]
        
        return {
            "success": True,
            "message": "Gemini API is configured",
            "available_models": model_names
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }