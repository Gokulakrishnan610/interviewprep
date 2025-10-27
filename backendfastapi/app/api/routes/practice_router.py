"""
Practice Mode Router - Handles practice interview sessions
Uses Gemini 2.5 Flash, Deepgram, and ElevenLabs
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime
import google.generativeai as genai

router = APIRouter()

# Configure Gemini 2.5 Flash
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        print("✅ Practice router: Gemini 2.5 Flash initialized")
    else:
        gemini_model = None
        print("⚠️ Practice router: GEMINI_API_KEY not found")
except Exception as e:
    print(f"❌ Practice router: Gemini initialization failed: {e}")
    gemini_model = None

# In-memory storage for practice sessions
practice_sessions = {}

class PracticeSessionRequest(BaseModel):
    session_id: str
    user_id: str
    position: str = "Backend Developer"
    difficulty: str = "intermediate"  # beginner, intermediate, advanced

class PracticeMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str

class PracticeResponse(BaseModel):
    session_id: str
    response: str
    suggestions: Optional[List[str]] = None

@router.post("/start-practice")
async def start_practice_session(request: PracticeSessionRequest):
    """Start a new practice interview session"""
    
    # Create session
    practice_sessions[request.session_id] = {
        "session_id": request.session_id,
        "user_id": request.user_id,
        "position": request.position,
        "difficulty": request.difficulty,
        "conversation": [],
        "started_at": datetime.now().isoformat(),
        "status": "active"
    }
    
    # Generate initial greeting based on position
    initial_message = f"""Hello! I'm Priya, your dedicated AI interview coach, and I'm excited to help you prepare for your {request.position} interview. Let's make sure you're ready to ace that interview!

To start, could you tell me a bit about yourself and your experience relevant to this {request.position} role?"""
    
    # Add to conversation
    practice_sessions[request.session_id]["conversation"].append({
        "role": "assistant",
        "content": initial_message,
        "timestamp": datetime.now().isoformat()
    })
    
    print(f"📝 Started practice session: {request.session_id} for {request.position}")
    
    return {
        "success": True,
        "session_id": request.session_id,
        "initial_message": initial_message,
        "position": request.position
    }

@router.post("/practice-message/{session_id}")
async def send_practice_message(session_id: str, message: PracticeMessage):
    """Send a message in practice mode and get AI response"""
    
    if session_id not in practice_sessions:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    session = practice_sessions[session_id]
    
    # Add user message to conversation
    session["conversation"].append({
        "role": message.role,
        "content": message.content,
        "timestamp": message.timestamp
    })
    
    # Generate AI response using Gemini
    if message.role == "user" and gemini_model:
        try:
            # Build conversation context
            position = session["position"]
            difficulty = session["difficulty"]
            
            prompt = f"""You are Priya, an expert AI interview coach conducting a practice interview for a {position} position at {difficulty} difficulty level.

Interview Guidelines:
- Ask relevant technical and behavioral questions
- Provide constructive feedback when appropriate
- Be encouraging and professional
- Keep responses conversational (2-3 sentences)
- Progress naturally through the interview

Conversation so far:
"""
            
            for msg in session["conversation"]:
                role_name = "Interviewer (You)" if msg["role"] == "assistant" else "Candidate"
                prompt += f"{role_name}: {msg['content']}\n"
            
            prompt += "\nInterviewer (You):"
            
            # Generate response
            response = gemini_model.generate_content(prompt)
            ai_response = response.text.strip()
            
            # Add AI response to conversation
            session["conversation"].append({
                "role": "assistant",
                "content": ai_response,
                "timestamp": datetime.now().isoformat()
            })
            
            print(f"🤖 Generated response for session {session_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "response": ai_response,
                "message_count": len(session["conversation"])
            }
            
        except Exception as e:
            print(f"❌ Error generating response: {e}")
            fallback_response = "That's interesting! Could you tell me more about that?"
            
            session["conversation"].append({
                "role": "assistant",
                "content": fallback_response,
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "success": True,
                "session_id": session_id,
                "response": fallback_response,
                "message_count": len(session["conversation"])
            }
    
    return {
        "success": True,
        "session_id": session_id,
        "message_count": len(session["conversation"])
    }

@router.post("/end-practice/{session_id}")
async def end_practice_session(session_id: str):
    """End practice session and provide feedback"""
    
    if session_id not in practice_sessions:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    session = practice_sessions[session_id]
    session["status"] = "completed"
    session["ended_at"] = datetime.now().isoformat()
    
    # Generate feedback using Gemini
    if gemini_model:
        try:
            # Build conversation summary
            conversation_text = "\n".join([
                f"{'Interviewer' if msg['role'] == 'assistant' else 'Candidate'}: {msg['content']}"
                for msg in session["conversation"]
            ])
            
            feedback_prompt = f"""Analyze this practice interview and provide constructive feedback:

Position: {session['position']}
Difficulty: {session['difficulty']}

Conversation:
{conversation_text}

Provide feedback in the following format:
1. Overall Performance (1 paragraph)
2. Strengths (3-5 bullet points)
3. Areas for Improvement (3-5 bullet points)
4. Specific Recommendations (3-5 bullet points)

Be encouraging but honest. Focus on actionable advice."""
            
            response = gemini_model.generate_content(feedback_prompt)
            feedback = response.text.strip()
            
            session["feedback"] = feedback
            
            print(f"✅ Generated feedback for session {session_id}")
            
            return {
                "success": True,
                "session_id": session_id,
                "feedback": feedback,
                "message_count": len(session["conversation"]),
                "duration": "N/A"  # Calculate if needed
            }
            
        except Exception as e:
            print(f"❌ Error generating feedback: {e}")
            return {
                "success": True,
                "session_id": session_id,
                "feedback": "Thank you for completing this practice session! Keep practicing to improve your interview skills.",
                "message_count": len(session["conversation"])
            }
    
    return {
        "success": True,
        "session_id": session_id,
        "message_count": len(session["conversation"])
    }

@router.get("/practice-session/{session_id}")
async def get_practice_session(session_id: str):
    """Get practice session data"""
    
    if session_id not in practice_sessions:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    return practice_sessions[session_id]

@router.get("/practice-transcript/{session_id}")
async def get_practice_transcript(session_id: str):
    """Get practice session transcript"""
    
    if session_id not in practice_sessions:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    session = practice_sessions[session_id]
    
    return {
        "session_id": session_id,
        "position": session["position"],
        "conversation": session["conversation"],
        "message_count": len(session["conversation"])
    }

@router.get("/health")
async def practice_health():
    """Health check for practice mode"""
    return {
        "status": "available",
        "gemini_available": gemini_model is not None,
        "active_sessions": len([s for s in practice_sessions.values() if s["status"] == "active"]),
        "model": "gemini-2.0-flash-exp"
    }
