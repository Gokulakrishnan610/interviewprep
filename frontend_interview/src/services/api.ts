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
  private authApi: AxiosInstance;
  private aiApi: AxiosInstance;
  private authBaseURL: string;
  private aiBaseURL: string;

  constructor() {
    this.authBaseURL = 'http://localhost:8000/api';  // Django for auth
    this.aiBaseURL = 'http://localhost:8001';        // FastAPI for AI features
    
    // Auth API (Django)
    this.authApi = axios.create({
      baseURL: this.authBaseURL,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // AI API (FastAPI)
    this.aiApi = axios.create({
      baseURL: this.aiBaseURL,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add response interceptor to handle errors (for both APIs)
    [this.authApi, this.aiApi].forEach(apiInstance => {
      apiInstance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: any) => {
          console.error('API Error:', error.response?.data || error.message);
          return Promise.reject(error);
        }
      );

      // Request interceptor to add auth token
      apiInstance.interceptors.request.use(
        (config: any) => {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error: any) => {
          return Promise.reject(error);
        }
      );
    });

    // Response interceptor to handle auth errors (for both APIs)
    [this.authApi, this.aiApi].forEach(apiInstance => {
      apiInstance.interceptors.response.use(
        (response: AxiosResponse) => {
          return response;
        },
        (error: any) => {
          if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      );
    });
  }

  // Generic request methods
  async get<T>(url: string, params?: any, useAuthApi: boolean = false): Promise<ApiResponse<T>> {
    try {
      const apiInstance = useAuthApi ? this.authApi : this.aiApi;
      const response = await apiInstance.get(url, { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async post<T>(url: string, data?: any, useAuthApi: boolean = false): Promise<ApiResponse<T>> {
    try {
      const apiInstance = useAuthApi ? this.authApi : this.aiApi;
      const response = await apiInstance.post(url, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.error || error.message,
      };
    }
  }

  async put<T>(url: string, data?: any, useAuthApi: boolean = false): Promise<ApiResponse<T>> {
    try {
      const apiInstance = useAuthApi ? this.authApi : this.aiApi;
      const response = await apiInstance.put(url, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  async delete<T>(url: string, useAuthApi: boolean = false): Promise<ApiResponse<T>> {
    try {
      const apiInstance = useAuthApi ? this.authApi : this.aiApi;
      const response = await apiInstance.delete(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Auth methods (use Django)
  async login(email: string, password: string): Promise<ApiResponse<any>> {
    return this.post('/auth/login/', { email, password }, true);
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
      
      const response = await this.authApi.post('/auth/register/', formattedData);
      
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
    return this.post('/auth/verify-email', { token }, true);
  }

  async resendVerification(email: string): Promise<ApiResponse<any>> {
    return this.post('/auth/resend-verification', { email }, true);
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/auth/me/', {}, true);
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<any>> {
    return this.post('/auth/token/refresh/', { refresh: refreshToken }, true);
  }

  // User methods (use Django)
  async getUserProfile(): Promise<ApiResponse<any>> {
    return this.get('/users/profile', {}, true);
  }

  async updateUserProfile(data: { first_name?: string; last_name?: string; email?: string; bio?: string; skills?: string[] }): Promise<ApiResponse<any>> {
    return this.put('/users/profile', data, true);
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    return this.get('/users/stats', {}, true);
  }

  // Session methods (use Django)
  async getSessions(params?: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get('/sessions', params, true);
  }

  async getSession(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sessions/${id}`, {}, true);
  }

  async createSession(sessionData: any): Promise<ApiResponse<any>> {
    return this.post('/sessions', sessionData, true);
  }

  async updateSession(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/sessions/${id}`, data, true);
  }

  async deleteSession(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/sessions/${id}`, true);
  }

  async getSessionStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/sessions/${id}/stats`, {}, true);
  }

  // Agent methods (use FastAPI)
  async getAgents(params?: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get('/agents', params, false);
  }

  async getAgent(id: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${id}`, {}, false);
  }

  async createAgent(agentData: any): Promise<ApiResponse<any>> {
    return this.post('/agents', agentData, false);
  }

  async updateAgent(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/agents/${id}`, data, false);
  }

  async deleteAgent(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/agents/${id}`, false);
  }

  async getAgentStats(id: string): Promise<ApiResponse<any>> {
    return this.get(`/agents/${id}/stats`, {}, false);
  }

  // Interview methods (use Django)
  async getInterviews(): Promise<ApiResponse<any[]>> {
    return this.get('/interviews', {}, true);
  }

  async createInterview(data: { sessionId: string; startTime?: Date }): Promise<ApiResponse<any>> {
    return this.post('/interviews', data, true);
  }

  async getInterview(id: string): Promise<ApiResponse<any>> {
    return this.get(`/interviews/${id}`, {}, true);
  }

  async updateInterviewStatus(id: string, status: string, score?: number): Promise<ApiResponse<any>> {
    return this.put(`/interviews/${id}/status`, { status, score }, true);
  }

  async addInterviewFeedback(id: string, feedbackData: any): Promise<ApiResponse<any>> {
    return this.post(`/interviews/${id}/feedback`, feedbackData, true);
  }

  async addInterviewTranscript(id: string, transcriptData: {
    speaker: string;
    message: string;
    confidence?: number;
  }): Promise<ApiResponse<any>> {
    return this.post(`/interviews/${id}/transcript`, transcriptData, true);
  }

  // Practice methods (use FastAPI)
  async getPracticeSessions(): Promise<ApiResponse<any[]>> {
    return this.get('/practice', {}, false);
  }

  async createPracticeSession(data: {
    agentId: string;
    category: string;
    duration?: number;
  }): Promise<ApiResponse<any>> {
    return this.post('/practice', data, false);
  }

  async getPracticeSession(id: string): Promise<ApiResponse<any>> {
    return this.get(`/practice/${id}`, {}, false);
  }

  async updatePracticeSessionStatus(id: string, status: string): Promise<ApiResponse<any>> {
    return this.put(`/practice/${id}/status`, { status }, false);
  }

  async addPracticeTranscript(id: string, transcriptData: {
    speaker: string;
    message: string;
    confidence?: number;
  }): Promise<ApiResponse<any>> {
    return this.post(`/practice/${id}/transcript`, transcriptData, false);
  }

  // LiveKit methods (use FastAPI)
  async startInterview(id: string): Promise<ApiResponse<{ token: string; room: string }>> {
    try {
      const response = await this.post<{ token: string; room: string }>(`/interviews/${id}/start`, {}, false);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Practice session methods (use FastAPI)
  async startPracticeSession(agentId: string): Promise<ApiResponse<any>> {
    return this.post('/agents/start_practice', { agent_id: agentId }, false);
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// Export types
export type { ApiResponse, PaginatedResponse }; 