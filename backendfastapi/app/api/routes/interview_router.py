from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import json

router = APIRouter()

# Import Gemini service for scoring
try:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        # Use gemini-1.5-flash (latest stable model)
        gemini_model = genai.GenerativeModel('gemini-2.5-flash')
        print("✅ Interview router: Gemini 2.5 Flash initialized successfully")
    else:
        gemini_model = None
        print("⚠️ Interview router: GEMINI_API_KEY not found")
except ImportError as e:
    print(f"❌ Interview router: Gemini import failed: {e}")
    gemini_model = None

class ConversationMessage(BaseModel):
    speaker: str  # 'interviewer' or 'candidate'
    message: str
    timestamp: str

class StartSessionRequest(BaseModel):
    session_id: str
    user_id: str
    interview_type: str

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
async def start_interview_session(request: StartSessionRequest):
    """Start a new interview session"""
    print(f"📝 Starting interview session: {request.session_id}")
    interview_sessions[request.session_id] = {
        "session_id": request.session_id,
        "user_id": request.user_id,
        "interview_type": request.interview_type,
        "conversation": [],
        "started_at": datetime.now().isoformat(),
        "status": "in_progress"
    }
    return {"success": True, "session_id": request.session_id}

@router.post("/add-message/{session_id}")
async def add_conversation_message(session_id: str, message: ConversationMessage):
    """Add a message to the conversation"""
    if session_id not in interview_sessions:
        print(f"⚠️ Session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")
    
    print(f"💬 Adding message to {session_id}: {message.speaker} - {message.message[:50]}...")
    interview_sessions[session_id]["conversation"].append(message.dict())
    return {"success": True}

@router.post("/end-session/{session_id}")
async def end_interview_session(session_id: str):
    """End interview session and calculate scores"""
    if session_id not in interview_sessions:
        print(f"⚠️ Session not found: {session_id}")
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = interview_sessions[session_id]
    session["ended_at"] = datetime.now().isoformat()
    session["status"] = "completed"
    
    # Calculate duration
    started = datetime.fromisoformat(session["started_at"])
    ended = datetime.fromisoformat(session["ended_at"])
    session["duration_seconds"] = int((ended - started).total_seconds())
    
    print(f"🏁 Ending interview session: {session_id}")
    print(f"   Duration: {session['duration_seconds']} seconds")
    print(f"   Messages: {len(session['conversation'])}")
    
    # Generate scores using AI
    try:
        scores = await generate_interview_scores(session)
        session["scores"] = scores
        print(f"✅ Scores generated for {session_id}")
        return {"success": True, "session_id": session_id, "scores": scores}
    except Exception as e:
        print(f"❌ Error generating scores: {e}")
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
    if not gemini_model:
        print("⚠️ Gemini not available, returning default scores")
        # Return default scores if Gemini is not available
        return {
            "technical_score": 75.0,
            "communication_score": 78.0,
            "confidence_score": 72.0,
            "problem_solving_score": 70.0,
            "overall_score": 73.75,
            "feedback_text": "AI scoring service is currently unavailable. Please ensure GEMINI_API_KEY is configured.",
            "strengths": [
                "Participated in the interview session",
                "Engaged with the interviewer",
                "Completed the full interview"
            ],
            "improvement_areas": [
                "Continue practicing technical concepts",
                "Work on communication skills",
                "Practice more interview scenarios"
            ]
        }
    
    conversation = session.get("conversation", [])
    interview_type = session.get("interview_type", "general")
    
    # If no conversation, return default scores
    if not conversation:
        print("⚠️ No conversation data, returning default scores")
        return {
            "technical_score": 70.0,
            "communication_score": 70.0,
            "confidence_score": 70.0,
            "problem_solving_score": 70.0,
            "overall_score": 70.0,
            "feedback_text": "No conversation data was captured during the interview. Please ensure the Beyond Presence agent is sending messages correctly.",
            "strengths": ["Attended the interview session"],
            "improvement_areas": ["Engage more actively in the conversation", "Ensure audio/video is working properly"]
        }
    
    # Format conversation for analysis
    conversation_text = "\n".join([
        f"{msg['speaker']}: {msg['message']}" 
        for msg in conversation
    ])
    
    print(f"🤖 Analyzing conversation with Gemini AI...")
    print(f"   Conversation length: {len(conversation_text)} characters")
    
    # Create prompt for Gemini
    prompt = f"""
You are an expert technical interviewer. Analyze the following interview conversation and provide detailed scores and feedback.

Interview Type: {interview_type}
Duration: {session.get('duration_seconds', 0)} seconds
Number of exchanges: {len(conversation)}

Conversation:
{conversation_text}

Please provide:
1. Technical Score (0-100): Evaluate technical knowledge, accuracy, and depth of answers
2. Communication Score (0-100): Evaluate clarity, articulation, and structure of responses
3. Confidence Score (0-100): Evaluate confidence level, hesitation, and assertiveness
4. Problem Solving Score (0-100): Evaluate analytical thinking and approach to problems
5. Overall Score (0-100): Weighted average considering all factors
6. Detailed Feedback: Comprehensive feedback on the interview performance (2-3 paragraphs)
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
        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()
        
        print(f"📊 Gemini response received: {len(response_text)} characters")
        
        # Extract JSON from response (handle markdown code blocks)
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        scores = json.loads(response_text.strip())
        print(f"✅ Scores parsed successfully")
        return scores
    except Exception as e:
        print(f"❌ Error generating scores with Gemini: {e}")
        # Return default scores on error
        return {
            "technical_score": 72.0,
            "communication_score": 75.0,
            "confidence_score": 73.0,
            "problem_solving_score": 70.0,
            "overall_score": 72.5,
            "feedback_text": f"The interview was completed, but there was an error analyzing the conversation: {str(e)}. Please try again or contact support.",
            "strengths": [
                "Participated in the interview",
                "Engaged with questions",
                "Completed the session"
            ],
            "improvement_areas": [
                "Continue practicing",
                "Review technical concepts",
                "Work on interview skills"
            ]
        }

@router.get("/health")
async def interview_health():
    return {
        "status": "available",
        "active_sessions": len(interview_sessions),
        "gemini_available": gemini_model is not None
    }
