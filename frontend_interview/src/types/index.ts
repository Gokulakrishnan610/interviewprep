// ── Auth / User ───────────────────────────────────────────────────────────────

export interface UserProfile {
  bio: string;
  preferred_language: string;
  interview_credits: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  avatar_id: string;
  profile: UserProfile | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface RegisterResponse extends TokenPair {
  message: string;
  email_sent: boolean;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export type RoundType = 'behavioral' | 'technical' | 'system_design' | 'hr' | 'mixed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface RoomTemplate {
  id: number;
  slug: string;
  title: string;
  description: string;
  company: string;
  role: string;
  round_type: RoundType;
  round_type_display: string;
  difficulty: Difficulty;
  difficulty_display: string;
  duration_minutes: number;
  interviewer_name: string;
  competencies: string[];
  is_active: boolean;
}

export interface RoomTemplateDetail extends RoomTemplate {
  interviewer_persona: string;
  rubric_dimensions: RubricDimension[];
  created_at: string;
}

export interface RubricDimension {
  name: string;
  weight?: number;
  description?: string;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// Match backend model: scheduled → in_progress → completed | cancelled
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface InterviewTurn {
  id: number;
  turn_number: number;
  question_text: string;
  asked_at: string | null;
  answer_text: string;
  answer_audio_url: string;
  answered_at: string | null;
}

export interface FeedbackReport {
  id: number;
  overall_score: number | null;
  dimension_scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}

export interface InterviewSessionSummary {
  id: number;
  room_template: RoomTemplate;
  status: SessionStatus;
  livekit_room_name: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  overall_score: number | null;
}

export interface InterviewSessionDetail {
  id: number;
  room_template: RoomTemplate;
  status: SessionStatus;
  livekit_room_name: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  turns: InterviewTurn[];
  report: FeedbackReport | null;
}

export interface SessionStartResponse {
  session: InterviewSessionDetail;
  livekit_token: string;
  livekit_room_name: string;
  livekit_url: string;
}

// ── WebSocket messages ────────────────────────────────────────────────────────

// Client → Server
export type WsClientMessage =
  | { type: 'audio_chunk'; data: string }
  | { type: 'end_answer' }
  | { type: 'end_session' };

// Server → Client
export type WsServerMessage =
  | { type: 'question'; text: string; turn_index: number }
  | { type: 'transcript_partial'; text: string }
  | { type: 'transcript_final'; text: string }
  | { type: 'follow_up'; text: string }
  | { type: 'session_complete'; report_ready: boolean }
  | { type: 'error'; message: string };
