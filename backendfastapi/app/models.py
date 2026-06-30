from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

DEFAULT_AVATAR_ID = "694c83e2-8895-4a98-bd16-56332ca3f449"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    profile_picture = Column(String, nullable=True)
    avatar_id = Column(String, default=DEFAULT_AVATAR_ID)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interviews = relationship("InterviewSession", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text, default="")
    preferred_language = Column(String, default="en")
    interview_credits = Column(Integer, default=0)
    skill_level = Column(String, default="beginner")

    user = relationship("User", back_populates="profile")

class InterviewSession(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_id = Column(String, unique=True, index=True)
    title = Column(String, default="Mock Interview")
    room_token = Column(String, nullable=True)
    room_name = Column(String, nullable=True)
    avatar_id = Column(String, default=DEFAULT_AVATAR_ID)
    interview_type = Column(String, default="technical")
    difficulty_level = Column(String, default="beginner")
    duration_minutes = Column(Integer, default=30)
    status = Column(String, default="scheduled")
    scheduled_time = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="interviews")
    responses = relationship("InterviewResponse", back_populates="interview", cascade="all, delete-orphan")
    analytics = relationship("InterviewAnalytics", back_populates="interview", uselist=False, cascade="all, delete-orphan")

class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    question_text = Column(Text)
    response_text = Column(Text)
    audio_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # AI Analysis Results
    sentiment_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    technical_accuracy = Column(Float, nullable=True)
    
    interview = relationship("InterviewSession", back_populates="responses")

class InterviewAnalytics(Base):
    __tablename__ = "interview_analytics"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    overall_score = Column(Float)
    technical_score = Column(Float)
    communication_score = Column(Float)
    confidence_score = Column(Float)
    feedback_summary = Column(Text)
    improvement_areas = Column(Text)
    strengths = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("InterviewSession", back_populates="analytics")

class AudioProcessing(Base):
    __tablename__ = "audio_processing"

    id = Column(Integer, primary_key=True, index=True)
    interview_response_id = Column(Integer, ForeignKey("interview_responses.id"))
    original_audio_url = Column(String)
    processed_audio_url = Column(String)
    transcription = Column(Text)
    duration_seconds = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class AvatarSession(Base):
    __tablename__ = "avatar_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, index=True)
    avatar_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
