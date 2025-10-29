/**
 * Interview Bot Service
 * Handles communication with the LiveKit interview bot server
 */

import axios, { AxiosInstance } from 'axios';

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface InterviewSession {
  room_name: string;
  user_token: string;
  agent_token: string;
  livekit_url: string;
  session_type: string;
  difficulty: string;
}

// Interview Bot service class
class InterviewBotService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_BOT_URL || 'http://localhost:3001';

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Interview Bot API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get(url, { params });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post(url, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete(url);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Interview session methods
  async createInterviewSession(data: {
    user_id: string;
    session_type?: string;
    difficulty?: string;
  }): Promise<ApiResponse<InterviewSession>> {
    return this.post('/api/create-interview-session', data);
  }

  async getSession(roomName: string): Promise<ApiResponse<any>> {
    return this.get(`/session/${roomName}`);
  }

  async endSession(roomName: string): Promise<ApiResponse<any>> {
    return this.delete(`/session/${roomName}`);
  }

  async healthCheck(): Promise<ApiResponse<any>> {
    return this.get('/health');
  }
}

// Create and export singleton instance
export const interviewBotService = new InterviewBotService();

// Export types
export type { ApiResponse };