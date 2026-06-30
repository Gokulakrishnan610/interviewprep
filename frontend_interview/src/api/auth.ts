import client from './client';
import type { RegisterResponse, TokenPair, User } from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// The backend returns tokens alongside the message on successful email verification
export interface VerifyEmailResponse {
  message: string;
  access_token?: string;
  refresh_token?: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await client.post<RegisterResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<TokenPair> => {
    const { data } = await client.post<TokenPair>('/auth/login', payload);
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await client.post<TokenPair>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  // Returns new tokens when verification succeeds — store them to auto-login the user
  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const { data } = await client.post<VerifyEmailResponse>('/auth/verify-email', { token });
    return data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const { data } = await client.post<{ message: string }>('/auth/resend-verification', { email });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await client.get<User>('/auth/me');
    return data;
  },

  updateMe: async (payload: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    preferred_language?: string;
    skill_level?: string;
  }): Promise<User> => {
    const { data } = await client.patch<User>('/auth/me', payload);
    return data;
  },
};
