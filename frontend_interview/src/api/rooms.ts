import client from './client';
import type { RoomTemplate, RoomTemplateDetail } from '../types';

export const roomsApi = {
  list: async (): Promise<RoomTemplate[]> => {
    const { data } = await client.get<RoomTemplate[]>('/rooms');
    return data;
  },

  getBySlug: async (slug: string): Promise<RoomTemplateDetail> => {
    const { data } = await client.get<RoomTemplateDetail>(`/rooms/${slug}`);
    return data;
  },
};
