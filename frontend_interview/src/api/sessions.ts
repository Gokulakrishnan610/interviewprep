import client from './client';
import type {
  InterviewSessionDetail,
  InterviewSessionSummary,
  SessionStartResponse,
} from '../types';

export const sessionsApi = {
  // POST /sessions → returns the created session (not a start response)
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

  // POST /sessions/{id}/start → issues LiveKit token and transitions to in_progress
  start: async (id: number): Promise<SessionStartResponse> => {
    const { data } = await client.post<SessionStartResponse>(`/sessions/${id}/start`);
    return data;
  },

  cancel: async (id: number): Promise<InterviewSessionDetail> => {
    const { data } = await client.post<InterviewSessionDetail>(`/sessions/${id}/cancel`);
    return data;
  },
};
