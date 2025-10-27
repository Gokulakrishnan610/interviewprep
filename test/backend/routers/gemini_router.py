from fastapi import APIRouter, HTTPException
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Initialize the router
router = APIRouter()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

@router.post("/respond")
async def get_gemini_response(data: dict):
    try:
        user_text = data.get("message", "")
        
        if not user_text:
            raise HTTPException(status_code=400, detail="No message provided")
        
        # Initialize the model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Generate response
        response = model.generate_content(user_text)
        
        return {
            "response": response.text,
            "success": True
        }
    
    except Exception as e:
        return {
            "error": f"Gemini API error: {str(e)}",
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