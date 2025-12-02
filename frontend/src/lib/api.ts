import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { needsRefresh, refreshWithRetry, isRefreshing, setRefreshing, clearTokens, storeTokenWithExpiry, validateAfterInactivity, updateLastActivity } from '../utils/tokenManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface QueuedRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ApiClient {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token and proactive refresh
    this.client.interceptors.request.use(
      async (config) => {
        // Update activity timestamp on every API request
        updateLastActivity();

        // Validate token freshness after inactivity (> 5 minutes)
        const validAfterInactivity = await validateAfterInactivity();
        if (!validAfterInactivity) {
          console.error('[API Client] Token validation failed after inactivity, redirecting to login');
          console.log('[API Client] Redirecting to login - Reason: Token validation failed after inactivity');
          window.location.href = '/login';
          return Promise.reject(new Error('Token validation failed after inactivity'));
        }

        // Check if token needs proactive refresh (< 2 minutes until expiry)
        if (needsRefresh() && !isRefreshing()) {
          console.log('[API Client] Token needs refresh before request, refreshing proactively');
          setRefreshing(true);
          
          try {
            const refreshSuccess = await refreshWithRetry();
            
            if (!refreshSuccess) {
              console.error('[API Client] Proactive refresh failed, redirecting to login');
              setRefreshing(false);
              console.log('[API Client] Redirecting to login - Reason: Proactive token refresh failed');
              window.location.href = '/login';
              return Promise.reject(new Error('Token refresh failed'));
            }
            
            console.log('[API Client] Proactive refresh successful');
          } finally {
            setRefreshing(false);
          }
        }
        
        // If refresh is in progress (from another request), wait for it
        if (isRefreshing()) {
          console.log('[API Client] Refresh in progress, waiting...');
          // Wait for refresh to complete (poll every 100ms, max 10 seconds)
          const maxWaitTime = 10000;
          const pollInterval = 100;
          let waited = 0;
          
          while (isRefreshing() && waited < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            waited += pollInterval;
          }
          
          if (waited >= maxWaitTime) {
            console.error('[API Client] Timeout waiting for refresh to complete');
            return Promise.reject(new Error('Token refresh timeout'));
          }
        }
        
        // Add authorization header with current token
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh with request queuing
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 403 for banned/deactivated users
        if (error.response?.status === 403) {
          const errorData = error.response.data as any;
          const errorMessage = errorData?.error || errorData?.message || '';
          
          // Check if this is a ban/deactivation error
          const isBannedOrDeactivated = 
            errorMessage.toLowerCase().includes('banned') ||
            errorMessage.toLowerCase().includes('deactivated') ||
            errorMessage.toLowerCase().includes('suspended');
          
          if (isBannedOrDeactivated) {
            console.log('[API Client] User banned/deactivated, clearing tokens and redirecting');
            clearTokens('User banned or deactivated');
            
            if (typeof window !== 'undefined') {
              // Redirect to login with error parameter
              const encodedMessage = encodeURIComponent(errorMessage);
              window.location.href = `/login?error=${encodedMessage}`;
            }
            
            return Promise.reject(error);
          }
        }

        // If 401 and not already retrying, handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Check for server/client time disagreement
          // If client thinks token is still valid but server says 401, log the disagreement
          if (!needsRefresh()) {
            const expiry = this.getTokenExpiry();
            if (expiry) {
              const now = new Date();
              const timeUntilExpiry = expiry.getTime() - now.getTime();
              const minutesRemaining = Math.floor(timeUntilExpiry / 1000 / 60);
              console.warn(
                `[API Client] Server/client time disagreement detected: ` +
                `Server returned 401 but client thinks token is valid for ${minutesRemaining} more minutes. ` +
                `Trusting server response and refreshing token.`
              );
            }
          }

          // If refresh is already in progress, queue this request
          if (isRefreshing()) {
            console.log('[API Client] Refresh in progress, queueing request');
            return this.queueRequest(originalRequest);
          }

          // Start refresh process
          setRefreshing(true);
          console.log('[API Client] Starting token refresh due to 401');

          try {
            const refreshSuccess = await refreshWithRetry();

            if (refreshSuccess) {
              // Refresh succeeded - process queue with new token
              const newToken = this.getAccessToken();
              console.log('[API Client] Token refresh successful, processing queue');
              this.processQueue(null, newToken);

              // Retry the original request with new token
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return this.client(originalRequest);
            } else {
              // Refresh failed - clear queue and redirect
              console.error('[API Client] Token refresh failed, clearing queue and redirecting');
              this.processQueue(new Error('Token refresh failed'), null);
              
              if (typeof window !== 'undefined') {
                console.log('[API Client] Redirecting to login - Reason: Token refresh failed after retries');
                window.location.href = '/login';
              }
              return Promise.reject(new Error('Token refresh failed'));
            }
          } catch (refreshError) {
            // Refresh failed with exception - clear queue and redirect
            console.error('[API Client] Token refresh exception:', refreshError);
            this.processQueue(refreshError as Error, null);
            
            if (typeof window !== 'undefined') {
              console.log('[API Client] Redirecting to login - Reason: Token refresh exception', refreshError);
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          } finally {
            setRefreshing(false);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Queue a request to be retried after token refresh completes
   */
  private queueRequest(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ config, resolve, reject });
    });
  }

  /**
   * Process all queued requests after token refresh
   * @param error - Error to reject all requests with (if refresh failed)
   * @param token - New access token to use for requests (if refresh succeeded)
   */
  private processQueue(error: Error | null, token: string | null): void {
    console.log(`[API Client] Processing queue with ${this.requestQueue.length} requests`);
    
    this.requestQueue.forEach((request) => {
      if (error) {
        // Refresh failed - reject all queued requests
        request.reject(error);
      } else {
        // Refresh succeeded - retry all queued requests with new token
        if (token) {
          request.config.headers = request.config.headers || {};
          request.config.headers.Authorization = `Bearer ${token}`;
        }
        request.resolve(this.client(request.config));
      }
    });

    // Clear the queue
    this.requestQueue = [];
  }

  // Token management
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  getTokenExpiry(): Date | null {
    if (typeof window === 'undefined') return null;
    
    const storedExpiry = localStorage.getItem('tokenExpiry');
    if (storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (!isNaN(expiryDate.getTime())) {
        return expiryDate;
      }
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
      localStorage.removeItem('tokenExpiry');
      console.log('[API Client] Tokens cleared from localStorage');
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
      storeTokenWithExpiry(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', { email, password });
    
    if (response.data.accessToken) {
      storeTokenWithExpiry(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    }

    return response.data;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    await this.client.post('/api/auth/logout', { refreshToken });
    clearTokens('User logout');
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

  async getAnalytics(days = 30) {
    const response = await this.client.get('/api/admin/analytics', {
      params: { days },
    });
    return response.data;
  }

  async getUserActivity(userId: string) {
    const response = await this.client.get(`/api/admin/users/${userId}/activity`);
    return response.data;
  }

  async bulkUserAction(action: 'ban' | 'unban' | 'delete', userIds: string[], reason?: string) {
    const response = await this.client.post('/api/admin/users/bulk-action', {
      action,
      userIds,
      reason,
    });
    return response.data;
  }

  async broadcastNotification(title: string, message: string, type: string, userIds?: string[]) {
    const response = await this.client.post('/api/admin/broadcast', {
      title,
      message,
      type,
      userIds,
    });
    return response.data;
  }

  async getAdminChats(limit = 20, offset = 0) {
    const response = await this.client.get('/api/admin/chats', {
      params: { limit, offset },
    });
    return response.data;
  }

  async getAuditLogs(limit = 50, offset = 0, action?: string, adminId?: string) {
    const response = await this.client.get('/api/admin/audit-logs', {
      params: { limit, offset, action, adminId },
    });
    return response.data;
  }

  async getSystemSettings() {
    const response = await this.client.get('/api/admin/settings');
    return response.data;
  }

  async updateSystemSettings(settings: any) {
    const response = await this.client.put('/api/admin/settings', settings);
    return response.data;
  }

  // Notifications
  async getNotifications() {
    const response = await this.client.get('/api/notifications');
    return response.data.notifications;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.client.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.put('/api/notifications/read-all');
    return response.data;
  }

  // Admin - Manage likes and matches
  async deleteLike(likeId: string) {
    const response = await this.client.delete(`/api/admin/likes/${likeId}`);
    return response.data;
  }

  async deleteMatch(matchId: string) {
    const response = await this.client.delete(`/api/admin/matches/${matchId}`);
    return response.data;
  }

  async getAllLikes(limit: number, offset: number, search?: string) {
    const params: any = { limit, offset };
    if (search) params.search = search;
    const response = await this.client.get('/api/admin/likes', { params });
    return response.data;
  }

  async getAllMatches(limit: number, offset: number, search?: string) {
    const params: any = { limit, offset };
    if (search) params.search = search;
    const response = await this.client.get('/api/admin/matches', { params });
    return response.data;
  }

  // Photos
  async uploadPhoto(imageData: string, isProfilePic: boolean = false) {
    const response = await this.client.post('/api/photos/upload', {
      imageData,
      isProfilePic,
    });
    return response.data;
  }

  async getPhotos() {
    const response = await this.client.get('/api/photos');
    return response.data.photos;
  }

  async updatePhoto(photoId: string, data: { isProfilePic?: boolean; order?: number }) {
    const response = await this.client.put(`/api/photos/${photoId}`, data);
    return response.data;
  }

  async deletePhoto(photoId: string) {
    const response = await this.client.delete(`/api/photos/${photoId}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export const api = apiClient; // Alias for convenience
