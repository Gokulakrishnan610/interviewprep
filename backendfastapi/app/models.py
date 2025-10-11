from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    session_id = Column(String, unique=True, index=True)
    status = Column(String)  # 'active', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    responses = relationship("InterviewResponse", back_populates="interview")
    analytics = relationship("InterviewAnalytics", back_populates="interview", uselist=False)

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
    
    # Relationships
    interview = relationship("Interview", back_populates="responses")

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
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    interview = relationship("Interview", back_populates="analytics")

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