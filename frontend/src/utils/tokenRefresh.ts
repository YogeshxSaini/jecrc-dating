/**
 * Token Refresh Utility
 * Automatically refreshes access tokens before they expire
 */

let refreshTimer: NodeJS.Timeout | null = null;

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://jecrc-dating-backend.onrender.com';
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    const apiBase = getApiBase();
    const response = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success && data.accessToken) {
      // Update access token
      localStorage.setItem('accessToken', data.accessToken);
      console.log('Access token refreshed successfully');
      
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tokenRefreshed'));
      }
      
      // Schedule next refresh (refresh 1 minute before expiry)
      scheduleTokenRefresh();
      
      return true;
    } else {
      console.error('Failed to refresh token:', data.error);
      // Clear tokens and redirect to login
      handleTokenExpiry();
      return false;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    handleTokenExpiry();
    return false;
  }
};

/**
 * Schedule automatic token refresh
 * Tokens expire in 15 minutes, so refresh after 14 minutes
 */
export const scheduleTokenRefresh = () => {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  // Schedule refresh for 14 minutes (1 minute before expiry)
  const refreshInterval = 14 * 60 * 1000; // 14 minutes in milliseconds
  
  refreshTimer = setTimeout(async () => {
    console.log('Auto-refreshing access token...');
    await refreshAccessToken();
  }, refreshInterval);
};

/**
 * Handle token expiry - clear tokens and redirect to login
 */
const handleTokenExpiry = () => {
  console.log('Token expired, redirecting to login...');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Only redirect if not already on login/signup pages
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (!['/login', '/signup', '/'].includes(currentPath)) {
      window.location.href = '/login?expired=true';
    }
  }
};

/**
 * Initialize token refresh on app start
 */
export const initializeTokenRefresh = () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (accessToken && refreshToken) {
    console.log('Initializing automatic token refresh');
    scheduleTokenRefresh();
  }
};

/**
 * Stop token refresh (on logout)
 */
export const stopTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};
