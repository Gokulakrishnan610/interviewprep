import client from './client';
import type { RoomTemplate, RoomTemplateDetail } from '../types';

export interface RoomListParams {
  round_type?: string;
  difficulty?: string;
  company?: string;
  search?: string;
}

export const roomsApi = {
  list: async (params?: RoomListParams): Promise<RoomTemplate[]> => {
    const { data } = await client.get<RoomTemplate[]>('/rooms', { params });
    return data;
  },

  // Backend GET /rooms/{room_id} takes an integer id, not a slug
  getById: async (id: number): Promise<RoomTemplateDetail> => {
    const { data } = await client.get<RoomTemplateDetail>(`/rooms/${id}`);
    return data;
  },
};
