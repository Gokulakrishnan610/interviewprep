import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API service class
class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    
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
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
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
      
      // Handle backend response format for auth endpoints
      if (url.includes('/auth/register') || url.includes('/auth/login') || url.includes('/auth/create-test-user')) {
        const { access_token, token, user } = response.data;
        return {
          success: true,
          data: {
            token: access_token || token,
            user: user
          } as T
        };
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: typeof error.response?.data?.detail === 'string' ? error.response.data.detail :
               typeof error.response?.data?.error === 'string' ? error.response.data.error :
               typeof error.message === 'string' ? error.message :
               'An error occurred',
      };
    }
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put(url, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: typeof error.response?.data?.error === 'string' ? error.response.data.error :
               typeof error.message === 'string' ? error.message :
               'An error occurred',
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
        error: typeof error.response?.data?.error === 'string' ? error.response.data.error :
               typeof error.message === 'string' ? error.message :
               'An error occurred',
      };
    }
  }

  // Auth methods
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    return this.post('/auth/login/', { email, password });
  }

  async register(userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
  }): Promise<ApiResponse<any>> {
    try {
      const formattedData = {
        email: userData.email.trim(),
        password: userData.password,
        first_name: userData.first_name.trim(),
        last_name: userData.last_name.trim(),
        username: userData.email.trim()  // Use email as username
      };
      
      const response = await this.api.post('/auth/register/', formattedData);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.error || error.message
      };
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse<any>> {
    return this.post('/auth/verify-email', { token });
  }

  async resendVerification(email: string): Promise<ApiResponse<any>> {
    return this.post('/auth/resend-verification', { email });
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/auth/me');
  }

  async createTestUser(): Promise<ApiResponse<any>> {
    return this.post('/auth/create-test-user/');
  }

  // User methods
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.get('/users/profile');
  }

  async updateUserProfile(data: { first_name?: string; last_name?: string; email?: string; bio?: string; skills?: string[] }): Promise<ApiResponse<any>> {
    return this.put('/users/profile', data);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.get('/users/stats');
  }

  // Session methods
  async getSessions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get('/sessions', params);
  }

  async getSession(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sessions/${id}`);
  }

  async createSession(sessionData: any): Promise<ApiResponse<any>> {
    return this.post('/sessions', sessionData);
  }

  async updateSession(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/sessions/${id}`, data);
  }

  async deleteSession(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/sessions/${id}`);
  }

  async getSessionStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sessions/${id}/stats`);
  }

  // Agent methods
  async getAgents(params?: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get('/agents', params);
  }

  async getAgent(id: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${id}`);
  }

  async createAgent(agentData: any): Promise<ApiResponse<any>> {
    return this.post('/agents', agentData);
  }

  async updateAgent(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/agents/${id}`);
  }

  async getAgentStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${id}/stats`);
  }

  // Interview methods
  async getInterviews(): Promise<ApiResponse<any[]>> {
    return this.get('/interviews');
  }

  async createInterview(data: { sessionId: string; startTime?: Date }): Promise<ApiResponse<any>> {
    return this.post('/interviews', data);
  }

  async getInterview(id: string): Promise<ApiResponse<any>> {
    return this.get(`/interviews/${id}`);
  }

  async updateInterviewStatus(id: string, status: string, score?: number): Promise<ApiResponse<any>> {
    return this.put(`/interviews/${id}/status`, { status, score });
  }

  async addInterviewFeedback(id: string, feedbackData: any): Promise<ApiResponse<any>> {
    return this.post(`/interviews/${id}/feedback`, feedbackData);
  }

  async addInterviewTranscript(id: string, transcriptData: {
    speaker: string;
    message: string;
    confidence?: number;
  }): Promise<ApiResponse<any>> {
    return this.post(`/interviews/${id}/transcript`, transcriptData);
  }

  // Practice methods
  async getPracticeSessions(): Promise<ApiResponse<any[]>> {
    return this.get('/practice');
  }

  async createPracticeSession(data: {
    agentId: string;
    category: string;
    duration?: number;
  }): Promise<ApiResponse<any>> {
    return this.post('/practice', data);
  }

  async getPracticeSession(id: string): Promise<ApiResponse<any>> {
    return this.get(`/practice/${id}`);
  }

  async updatePracticeSessionStatus(id: string, status: string): Promise<ApiResponse<any>> {
    return this.put(`/practice/${id}/status`, { status });
  }

  async addPracticeTranscript(id: string, transcriptData: {
    speaker: string;
    message: string;
    confidence?: number;
  }): Promise<ApiResponse<any>> {
    return this.post(`/practice/${id}/transcript`, transcriptData);
  }

  // LiveKit Interview Bot methods
  async createInterviewSession(data: {
    user_id: string;
    session_type?: string;
    difficulty?: string;
  }): Promise<ApiResponse<{
    room_name: string;
    user_token: string;
    agent_token: string;
    livekit_url: string;
    session_type: string;
    difficulty: string;
  }>> {
    return this.post('/create-interview-session', data);
  }

  // Legacy method for regular interviews (Django backend)
  async startInterview(id: string): Promise<ApiResponse<{ token: string; room: string }>> {
    try {
      const response = await this.post<any>(`/interviews/sessions/${id}/start/`);
      if (response.success && response.data) {
        const data = response.data as any;
        const token = data.token || data.room_token || data.livekit_token;
        const room = data.room || data.room_name;
        return {
          success: true,
          data: { token, room }
        };
      }
      return response as ApiResponse<{ token: string; room: string }>;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export types
export type { ApiResponse, PaginatedResponse }; 