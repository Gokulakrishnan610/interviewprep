from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os

router = APIRouter()

# Import Gemini service for scoring
try:
    from app.services.gemini_service import gemini_service
    print("✅ Interview router: Gemini service imported successfully")
except ImportError as e:
    print(f"❌ Interview router: Gemini service import failed: {e}")
    gemini_service = None

class ConversationMessage(BaseModel):
    speaker: str  # 'interviewer' or 'candidate'
    message: str
    timestamp: str

class InterviewData(BaseModel):
    session_id: str
    user_id: str
    interview_type: str
    conversation: List[ConversationMessage]
    duration_seconds: int
    started_at: str
    ended_at: str

class InterviewScore(BaseModel):
    technical_score: float
    communication_score: float
    confidence_score: float
    problem_solving_score: float
    overall_score: float
    feedback_text: str
    strengths: List[str]
    improvement_areas: List[str]

# In-memory storage (replace with database in production)
interview_sessions = {}

@router.post("/start-session")
async def start_interview_session(session_id: str, user_id: str, interview_type: str):
    """Start a new interview session"""
    interview_sessions[session_id] = {
        "session_id": session_id,
        "user_id": user_id,
        "interview_type": interview_type,
        "conversation": [],
        "started_at": datetime.now().isoformat(),
        "status": "in_progress"
    }
    return {"success": True, "session_id": session_id}

@router.post("/add-message/{session_id}")
async def add_conversation_message(session_id: str, message: ConversationMessage):
    """Add a message to the conversation"""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    interview_sessions[session_id]["conversation"].append(message.dict())
    return {"success": True}

@router.post("/end-session/{session_id}")
async def end_interview_session(session_id: str):
    """End interview session and calculate scores"""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = interview_sessions[session_id]
    session["ended_at"] = datetime.now().isoformat()
    session["status"] = "completed"
    
    # Calculate duration
    started = datetime.fromisoformat(session["started_at"])
    ended = datetime.fromisoformat(session["ended_at"])
    session["duration_seconds"] = int((ended - started).total_seconds())
    
    # Generate scores using AI
    try:
        scores = await generate_interview_scores(session)
        session["scores"] = scores
        return {"success": True, "session_id": session_id, "scores": scores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating scores: {str(e)}")

@router.get("/session/{session_id}")
async def get_interview_session(session_id: str):
    """Get interview session data"""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True, "data": interview_sessions[session_id]}

@router.get("/session/{session_id}/transcript")
async def get_interview_transcript(session_id: str):
    """Get interview transcript"""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    conversation = interview_sessions[session_id].get("conversation", [])
    return {"success": True, "transcript": conversation}

async def generate_interview_scores(session: dict) -> dict:
    """Generate interview scores using Gemini AI"""
    if not gemini_service:
        # Return default scores if Gemini is not available
        return {
            "technical_score": 0.0,
            "communication_score": 0.0,
            "confidence_score": 0.0,
            "problem_solving_score": 0.0,
            "overall_score": 0.0,
            "feedback_text": "AI scoring service unavailable",
            "strengths": [],
            "improvement_areas": []
        }
    
    conversation = session.get("conversation", [])
    interview_type = session.get("interview_type", "general")
    
    # Format conversation for analysis
    conversation_text = "\n".join([
        f"{msg['speaker']}: {msg['message']}" 
        for msg in conversation
    ])
    
    # Create prompt for Gemini
    prompt = f"""
You are an expert technical interviewer. Analyze the following interview conversation and provide detailed scores and feedback.

Interview Type: {interview_type}
Duration: {session.get('duration_seconds', 0)} seconds

Conversation:
{conversation_text}

Please provide:
1. Technical Score (0-100): Evaluate technical knowledge, accuracy, and depth of answers
2. Communication Score (0-100): Evaluate clarity, articulation, and structure of responses
3. Confidence Score (0-100): Evaluate confidence level, hesitation, and assertiveness
4. Problem Solving Score (0-100): Evaluate analytical thinking and approach to problems
5. Overall Score (0-100): Weighted average considering all factors
6. Detailed Feedback: Comprehensive feedback on the interview performance
7. Strengths: List 3-5 key strengths demonstrated
8. Improvement Areas: List 3-5 areas for improvement

Format your response as JSON with the following structure:
{{
    "technical_score": <number>,
    "communication_score": <number>,
    "confidence_score": <number>,
    "problem_solving_score": <number>,
    "overall_score": <number>,
    "feedback_text": "<detailed feedback>",
    "strengths": ["strength1", "strength2", ...],
    "improvement_areas": ["area1", "area2", ...]
}}
"""
    
    try:
        # Use Gemini to generate scores
        response = await gemini_service.generate_content(prompt)
        
        # Parse JSON response
        import json
        # Extract JSON from response (handle markdown code blocks)
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        scores = json.loads(response_text.strip())
        return scores
    except Exception as e:
        print(f"Error generating scores with Gemini: {e}")
        # Return default scores on error
        return {
            "technical_score": 70.0,
            "communication_score": 75.0,
            "confidence_score": 72.0,
            "problem_solving_score": 68.0,
            "overall_score": 71.25,
            "feedback_text": f"Error analyzing interview: {str(e)}",
            "strengths": ["Participated in the interview", "Engaged with questions"],
            "improvement_areas": ["Continue practicing", "Review technical concepts"]
        }

@router.get("/health")
async def interview_health():
    return {"status": "available", "active_sessions": len(interview_sessions)}
