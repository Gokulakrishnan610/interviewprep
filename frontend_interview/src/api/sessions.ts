import client from './client';
import type {
  InterviewSessionDetail,
  InterviewSessionSummary,
  SessionStartResponse,
} from '../types';

export const sessionsApi = {
  create: async (roomTemplateId: number): Promise<SessionStartResponse> => {
    const { data } = await client.post<SessionStartResponse>('/sessions', {
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

  getReport: async (id: number): Promise<InterviewSessionDetail> => {
    const { data } = await client.get<InterviewSessionDetail>(`/sessions/${id}/report`);
    return data;
  },
};
