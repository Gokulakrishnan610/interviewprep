import client from './client';
import type { RoomTemplate } from '../types';

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
};
