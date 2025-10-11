import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  InterviewSession, 
  MockInterview, 
  InterviewFeedback, 
  AIAgent, 
  PracticeSession 
} from '../types';

interface InterviewState {
  user: any;
  sessions: InterviewSession[];
  mockInterviews: MockInterview[];
  aiAgents: AIAgent[];
  practiceSessions: PracticeSession[];
  currentSession: InterviewSession | null;
  currentInterview: MockInterview | null;
  isLoading: boolean;
  error: string | null;
}

type InterviewAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_SESSIONS'; payload: InterviewSession[] }
  | { type: 'SET_MOCK_INTERVIEWS'; payload: MockInterview[] }
  | { type: 'SET_AI_AGENTS'; payload: AIAgent[] }
  | { type: 'SET_CURRENT_SESSION'; payload: InterviewSession | null }
  | { type: 'SET_CURRENT_INTERVIEW'; payload: MockInterview | null }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; payload: { interviewId: string; entry: any } }
  | { type: 'UPDATE_INTERVIEW_FEEDBACK'; payload: { interviewId: string; feedback: InterviewFeedback } };

const initialState: InterviewState = {
  user: null,
  sessions: [],
  mockInterviews: [],
  aiAgents: [],
  practiceSessions: [],
  currentSession: null,
  currentInterview: null,
  isLoading: false,
  error: null,
};

const interviewReducer = (state: InterviewState, action: InterviewAction): InterviewState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_MOCK_INTERVIEWS':
      return { ...state, mockInterviews: action.payload };
    case 'SET_AI_AGENTS':
      return { ...state, aiAgents: action.payload };
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    case 'SET_CURRENT_INTERVIEW':
      return { ...state, currentInterview: action.payload };
    case 'ADD_TRANSCRIPT_ENTRY':
      return {
        ...state,
        mockInterviews: state.mockInterviews.map(interview =>
          interview.id === action.payload.interviewId
            ? { ...interview, transcript: [...interview.transcript, action.payload.entry] }
            : interview
        ),
      };
    case 'UPDATE_INTERVIEW_FEEDBACK':
      return {
        ...state,
        mockInterviews: state.mockInterviews.map(interview =>
          interview.id === action.payload.interviewId
            ? { ...interview, feedback: action.payload.feedback }
            : interview
        ),
      };
    default:
      return state;
  }
};

interface InterviewContextType {
  state: InterviewState;
  dispatch: React.Dispatch<InterviewAction>;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

interface InterviewProviderProps {
  children: ReactNode;
}

export const InterviewProvider: React.FC<InterviewProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  return (
    <InterviewContext.Provider value={{ state, dispatch }}>
      {children}
    </InterviewContext.Provider>
  );
}; 