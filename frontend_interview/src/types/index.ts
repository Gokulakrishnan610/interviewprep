export enum UserRole {
  STUDENT = "STUDENT"
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface InterviewSession {
  id: string;
  title: string;
  description: string;
  category: InterviewCategory;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number; // in minutes
  questions: InterviewQuestion[];
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface InterviewCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL' | 'GENERAL';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  expectedAnswer?: string;
  tips?: string[];
}

export interface MockInterview {
  id: string;
  session_id: string;
  user_id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  start_time: string;
  end_time?: string;
  score?: number;
  livekit_room?: string;
  feedback?: InterviewFeedback;
  transcript: InterviewTranscript[];
  created_at: string;
}

export interface InterviewFeedback {
  overall_score: number;
  communication_score: number;
  technical_score: number;
  problem_solving_score: number;
  confidence_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  detailed_feedback: string;
  recommendations: string[];
}

export interface InterviewTranscript {
  id: string;
  timestamp: string;
  speaker: 'STUDENT' | 'AI_INTERVIEWER';
  message: string;
  confidence?: number;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  avatar: string;
  is_active: boolean;
  rating: number;
  sessions_count: number;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  agent_id: string;
  category: string;
  duration: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  start_time: string;
  end_time?: string;
  livekit_room?: string;
  transcript: InterviewTranscript[];
} 