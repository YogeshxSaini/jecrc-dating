import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/auth/refresh`, {
                refreshToken,
              });

              const { accessToken } = response.data;
              this.setAccessToken(accessToken);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', token);
    }
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // Auth endpoints
  async requestVerification(email: string, loginMode = false) {
    const response = await this.client.post('/api/auth/request-verification', {
      email,
      loginMode,
    });
    return response.data;
  }

  async verifyOTP(email: string, otp: string, password?: string, displayName?: string) {
    const response = await this.client.post('/api/auth/verify', {
      email,
      otp,
      password,
      displayName,
    });
    
    if (response.data.accessToken) {
      this.setAccessToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    
    if (response.data.accessToken) {
      this.setAccessToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    await this.client.post('/api/auth/logout', { refreshToken });
    this.clearTokens();
  }

  async getMe() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Profile endpoints
  async getMyProfile() {
    const response = await this.client.get('/api/profile/me');
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/api/profile', data);
    return response.data;
  }

  async getProfile(userId: string) {
    const response = await this.client.get(`/api/profile/${userId}`);
    return response.data;
  }

  // Discovery endpoints
  async getDiscoverFeed(limit = 10, offset = 0) {
    const response = await this.client.get('/api/discover', {
      params: { limit, offset },
    });
    return response.data;
  }

  // Likes endpoints
  async likeUser(toUserId: string) {
    const response = await this.client.post('/api/likes', { toUserId });
    return response.data;
  }

  async passUser(toUserId: string) {
    const response = await this.client.post(`/api/discover/pass/${toUserId}`);
    return response.data;
  }

  async unlikeUser(userId: string) {
    const response = await this.client.delete(`/api/likes/${userId}`);
    return response.data;
  }

  async getReceivedLikes() {
    const response = await this.client.get('/api/likes/received');
    return response.data;
  }

  // Matches endpoints
  async getMatches() {
    const response = await this.client.get('/api/matches');
    return response.data;
  }

  async getMatch(matchId: string) {
    const response = await this.client.get(`/api/matches/${matchId}`);
    return response.data;
  }

  // Chat endpoints
  async getMessages(matchId: string, limit = 50, offset = 0) {
    const response = await this.client.get(`/api/chat/${matchId}/messages`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async sendMessage(matchId: string, content: string) {
    const response = await this.client.post(`/api/chat/${matchId}/messages`, { content });
    return response.data;
  }

  // Admin endpoints
  async getPhotoVerifications(status?: string) {
    const response = await this.client.get('/api/admin/photo-verifications', {
      params: { status },
    });
    return response.data;
  }

  async reviewPhotoVerification(id: string, status: string, reason?: string) {
    const response = await this.client.post(`/api/admin/photo-verifications/${id}/review`, {
      status,
      reason,
    });
    return response.data;
  }

  async getReports(status?: string) {
    const response = await this.client.get('/api/admin/reports', {
      params: { status },
    });
    return response.data;
  }

  async banUser(userId: string, reason: string) {
    const response = await this.client.post(`/api/admin/users/${userId}/ban`, { reason });
    return response.data;
  }

  async unbanUser(userId: string) {
    const response = await this.client.post(`/api/admin/users/${userId}/unban`);
    return response.data;
  }

  async getAdminStats() {
    const response = await this.client.get('/api/admin/stats');
    return response.data;
  }

  async getAdminUsers(limit = 20, offset = 0, search?: string) {
    const response = await this.client.get('/api/admin/users', {
      params: { limit, offset, search },
    });
    return response.data;
  }

  async reviewReport(reportId: string, status: string, resolution: string) {
    const response = await this.client.post(`/api/admin/reports/${reportId}/review`, {
      status,
      resolution,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export const api = apiClient; // Alias for convenience
