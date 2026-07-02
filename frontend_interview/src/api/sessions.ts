import client from './client';
import type {
  FeedbackReport,
  InterviewSessionDetail,
  InterviewSessionSummary,
  ReportStatus,
  SessionStartResponse,
} from '../types';

export const sessionsApi = {
  // POST /sessions → returns the created session
  create: async (roomTemplateId: number): Promise<InterviewSessionDetail> => {
    const { data } = await client.post<InterviewSessionDetail>('/sessions', {
      room_template_id: roomTemplateId,
    });
    return data;
  },

  list: async (): Promise<InterviewSessionSummary[]> => {
    const { data } = await client.get<InterviewSessionSummary[]>('/sessions');
    return data;
  },

  getById: async (id: number): Promise<InterviewSessionDetail> => {
    const { data } = await client.get<InterviewSessionDetail>(`/sessions/${id}`);
    return data;
  },

  // POST /sessions/{id}/start → transitions to in_progress, returns LiveKit token
  start: async (id: number): Promise<SessionStartResponse> => {
    const { data } = await client.post<SessionStartResponse>(`/sessions/${id}/start`);
    return data;
  },

  cancel: async (id: number): Promise<InterviewSessionDetail> => {
    const { data } = await client.post<InterviewSessionDetail>(`/sessions/${id}/cancel`);
    return data;
  },

  // GET /sessions/{id}/report → 404 if not ready yet
  getReport: async (id: number): Promise<FeedbackReport> => {
    const { data } = await client.get<FeedbackReport>(`/sessions/${id}/report`);
    return data;
  },

  // GET /sessions/{id}/report/status → poll while pending/running
  getReportStatus: async (id: number): Promise<ReportStatus> => {
    const { data } = await client.get<ReportStatus>(`/sessions/${id}/report/status`);
    return data;
  },

  // POST /sessions/{id}/report/generate → trigger (or re-trigger) report generation
  generateReport: async (id: number): Promise<ReportStatus> => {
    const { data } = await client.post<ReportStatus>(`/sessions/${id}/report/generate`);
    return data;
  },
};
