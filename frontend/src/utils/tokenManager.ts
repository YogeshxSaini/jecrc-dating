/**
 * Token Manager - Centralized token lifecycle management
 * Handles token expiry calculation, refresh scheduling, and state tracking
 */

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiry (Unix timestamp)
}

// Refresh state tracking
let isRefreshingToken = false;
let refreshScheduleTimeout: NodeJS.Timeout | null = null;

// Inactivity tracking
let lastActivityTimestamp: number = Date.now();
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Debug mode flag for verbose logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Parse JWT token and extract payload
 */
export function parseJWT(token: string): TokenPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[TokenManager] Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Get token expiry date from stored token
 * Returns null if token doesn't exist or can't be parsed
 */
export function getTokenExpiry(): Date | null {
  if (typeof window === 'undefined') return null;

  // First try to get from stored expiry
  const storedExpiry = localStorage.getItem('tokenExpiry');
  if (storedExpiry) {
    const expiryDate = new Date(storedExpiry);
    if (!isNaN(expiryDate.getTime())) {
      if (DEBUG_MODE) {
        console.log('[TokenManager] Token expiry from storage:', expiryDate.toISOString());
      }
      return expiryDate;
    }
  }

  // Fallback: parse from access token
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    if (DEBUG_MODE) {
      console.log('[TokenManager] No access token found');
    }
    return null;
  }

  const payload = parseJWT(accessToken);
  if (!payload || !payload.exp) {
    console.error('[TokenManager] Invalid token payload');
    return null;
  }

  const expiryDate = new Date(payload.exp * 1000);
  if (DEBUG_MODE) {
    console.log('[TokenManager] Token expiry from JWT:', expiryDate.toISOString());
  }
  return expiryDate;
}

/**
 * Check if token needs refresh (expires in < 2 minutes)
 */
export function needsRefresh(): boolean {
  const expiry = getTokenExpiry();
  if (!expiry) {
    if (DEBUG_MODE) {
      console.log('[TokenManager] No expiry found, refresh not needed');
    }
    return false;
  }

  const now = new Date();
  const timeUntilExpiry = expiry.getTime() - now.getTime();
  const twoMinutesInMs = 2 * 60 * 1000;

  const needs = timeUntilExpiry < twoMinutesInMs;

  if (DEBUG_MODE) {
    const minutesRemaining = Math.floor(timeUntilExpiry / 1000 / 60);
    const secondsRemaining = Math.floor((timeUntilExpiry / 1000) % 60);
    console.log(
      `[TokenManager] Token expires in ${minutesRemaining}m ${secondsRemaining}s, needs refresh: ${needs}`
    );
  }

  return needs;
}

/**
 * Store access token with calculated expiry
 */
export function storeTokenWithExpiry(accessToken: string): void {
  if (typeof window === 'undefined') return;

  const payload = parseJWT(accessToken);
  if (!payload || !payload.exp) {
    console.error('[TokenManager] Cannot store token: invalid payload');
    return;
  }

  const expiryDate = new Date(payload.exp * 1000);

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('tokenExpiry', expiryDate.toISOString());

  console.log('[TokenManager] Token stored with expiry:', expiryDate.toISOString());

  if (DEBUG_MODE) {
    const now = new Date();
    const timeUntilExpiry = expiryDate.getTime() - now.getTime();
    const minutesRemaining = Math.floor(timeUntilExpiry / 1000 / 60);
    console.log(`[TokenManager] Token valid for ${minutesRemaining} minutes`);
  }
}

/**
 * Clear all tokens and expiry from storage
 */
export function clearTokens(reason?: string): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');

  console.log('[TokenManager] Tokens cleared', reason ? `- Reason: ${reason}` : '');

  // Clear any scheduled refresh
  if (refreshScheduleTimeout) {
    clearTimeout(refreshScheduleTimeout);
    refreshScheduleTimeout = null;
    if (DEBUG_MODE) {
      console.log('[TokenManager] Refresh schedule cleared');
    }
  }

  // Reset refresh state
  isRefreshingToken = false;
}

/**
 * Check if a token refresh is currently in progress
 */
export function isRefreshing(): boolean {
  return isRefreshingToken;
}

/**
 * Set refresh state (used by API client)
 */
export function setRefreshing(state: boolean): void {
  isRefreshingToken = state;
  if (DEBUG_MODE) {
    console.log('[TokenManager] Refresh state set to:', state);
  }
}

/**
 * Get current refresh schedule timeout (for testing/debugging)
 */
export function getRefreshScheduleTimeout(): NodeJS.Timeout | null {
  return refreshScheduleTimeout;
}

/**
 * Set refresh schedule timeout (used by scheduling logic)
 */
export function setRefreshScheduleTimeout(timeout: NodeJS.Timeout | null): void {
  if (refreshScheduleTimeout) {
    clearTimeout(refreshScheduleTimeout);
  }
  refreshScheduleTimeout = timeout;
}

/**
 * Update last activity timestamp
 * Should be called on user interactions and API requests
 */
export function updateLastActivity(): void {
  lastActivityTimestamp = Date.now();
  if (DEBUG_MODE) {
    console.log('[TokenManager] Activity timestamp updated');
  }
}

/**
 * Get time since last activity in milliseconds
 */
export function getTimeSinceLastActivity(): number {
  return Date.now() - lastActivityTimestamp;
}

/**
 * Check if user has been inactive for more than the threshold (5 minutes)
 */
export function isInactive(): boolean {
  const timeSinceActivity = getTimeSinceLastActivity();
  const inactive = timeSinceActivity > INACTIVITY_THRESHOLD_MS;

  if (DEBUG_MODE && inactive) {
    const minutesInactive = Math.floor(timeSinceActivity / 1000 / 60);
    console.log(`[TokenManager] User inactive for ${minutesInactive} minutes`);
  }

  return inactive;
}

/**
 * Validate token freshness after inactivity
 * Returns true if token is valid or was successfully refreshed
 * Returns false if token is invalid and refresh failed
 */
export async function validateAfterInactivity(): Promise<boolean> {
  if (!isInactive()) {
    if (DEBUG_MODE) {
      console.log('[TokenManager] User active, no validation needed');
    }
    return true;
  }

  console.log('[TokenManager] User inactive, validating token freshness');

  // Check if token needs refresh
  if (needsRefresh()) {
    console.log('[TokenManager] Token needs refresh after inactivity, refreshing');

    setRefreshing(true);
    try {
      const refreshSuccess = await refreshWithRetry();

      if (refreshSuccess) {
        console.log('[TokenManager] Token refreshed successfully after inactivity');
        // Update activity timestamp after successful refresh
        updateLastActivity();
        return true;
      } else {
        console.error('[TokenManager] Token refresh failed after inactivity');
        return false;
      }
    } finally {
      setRefreshing(false);
    }
  } else {
    if (DEBUG_MODE) {
      console.log('[TokenManager] Token still valid after inactivity');
    }
    // Update activity timestamp since we validated
    updateLastActivity();
    return true;
  }
}

/**
 * Initialize token manager
 * Should be called on application startup
 */
export function initialize(): void {
  if (typeof window === 'undefined') return;

  console.log('[TokenManager] Initializing token manager');

  // Initialize activity timestamp
  updateLastActivity();

  // Check if we have a token
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    if (DEBUG_MODE) {
      console.log('[TokenManager] No token found, skipping initialization');
    }
    return;
  }

  // Ensure token has expiry stored
  const storedExpiry = localStorage.getItem('tokenExpiry');
  if (!storedExpiry) {
    console.log('[TokenManager] Token found without expiry, calculating and storing');
    storeTokenWithExpiry(accessToken);
  }

  // Check if token needs immediate refresh
  if (needsRefresh()) {
    console.log('[TokenManager] Token needs immediate refresh');
  } else {
    if (DEBUG_MODE) {
      const expiry = getTokenExpiry();
      if (expiry) {
        const now = new Date();
        const timeUntilRefresh = expiry.getTime() - now.getTime() - 2 * 60 * 1000;
        const minutesUntilRefresh = Math.floor(timeUntilRefresh / 1000 / 60);
        console.log(`[TokenManager] Token valid, refresh scheduled in ~${minutesUntilRefresh} minutes`);
      }
    }
  }

  console.log('[TokenManager] Initialization complete');
}

/**
 * Check if error is a network error (not a 401 from refresh endpoint)
 */
function isNetworkError(error: any): boolean {
  // Network errors don't have a response
  if (!error.response) {
    return true;
  }

  // Check for network-related status codes
  const networkStatusCodes = [408, 429, 500, 502, 503, 504];
  return networkStatusCodes.includes(error.response.status);
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Refresh token with retry logic and exponential backoff
 * Retries up to 2 times for network errors with delays of 1s, 2s
 * Does not retry for 401 errors from refresh endpoint
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @returns Promise<boolean> - true if refresh succeeded, false otherwise
 */
export async function refreshWithRetry(attempt: number = 0): Promise<boolean> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  if (typeof window === 'undefined') {
    console.error('[TokenManager] Cannot refresh token: not in browser environment');
    return false;
  }

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.error('[TokenManager] No refresh token available');
    clearTokens('No refresh token available');
    return false;
  }

  try {
    if (DEBUG_MODE) {
      console.log(`[TokenManager] Attempting token refresh (attempt ${attempt + 1})`);
    }

    // Import axios dynamically to avoid circular dependencies
    const axios = (await import('axios')).default;

    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken,
    });

    const { accessToken } = response.data;

    if (!accessToken) {
      console.error('[TokenManager] Refresh response missing accessToken');
      clearTokens('Invalid refresh response');
      return false;
    }

    // Store the new token with expiry
    storeTokenWithExpiry(accessToken);
    console.log('[TokenManager] Token refresh successful');

    return true;
  } catch (error: any) {
    // Handle 401 from refresh endpoint - no retry
    if (error.response?.status === 401) {
      console.error('[TokenManager] Refresh token invalid or expired (401)');
      clearTokens('Refresh token invalid or expired');
      return false;
    }

    // Handle network errors with retry
    if (isNetworkError(error) && attempt < 2) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
      console.warn(
        `[TokenManager] Network error during refresh, retrying in ${delay}ms (attempt ${attempt + 1}/2)`,
        error.message
      );

      await sleep(delay);
      return refreshWithRetry(attempt + 1);
    }

    // All retries exhausted or non-retryable error
    console.error(
      `[TokenManager] Token refresh failed after ${attempt + 1} attempt(s)`,
      error.message
    );
    clearTokens('Token refresh failed');
    return false;
  }
}

/**
 * Schedule proactive token refresh
 * Calculates time until refresh needed (expiry - 2 minutes) and sets timeout
 * Clears any existing timeout before setting new one
 * Handles edge case where token already needs refresh
 */
export function scheduleProactiveRefresh(): void {
  if (typeof window === 'undefined') return;

  // Clear any existing scheduled refresh
  if (refreshScheduleTimeout) {
    clearTimeout(refreshScheduleTimeout);
    refreshScheduleTimeout = null;
    if (DEBUG_MODE) {
      console.log('[TokenManager] Cleared existing refresh schedule');
    }
  }

  const expiry = getTokenExpiry();
  if (!expiry) {
    if (DEBUG_MODE) {
      console.log('[TokenManager] No token expiry found, cannot schedule refresh');
    }
    return;
  }

  const now = new Date();
  const timeUntilExpiry = expiry.getTime() - now.getTime();
  const twoMinutesInMs = 2 * 60 * 1000;
  const timeUntilRefresh = timeUntilExpiry - twoMinutesInMs;

  // Edge case: token already needs refresh (expires in < 2 minutes)
  if (timeUntilRefresh <= 0) {
    console.log('[TokenManager] Token already needs refresh, triggering immediately');
    refreshWithRetry().catch((error) => {
      console.error('[TokenManager] Immediate refresh failed:', error);
    });
    return;
  }

  // Schedule refresh for 2 minutes before expiry
  const minutesUntilRefresh = Math.floor(timeUntilRefresh / 1000 / 60);
  const secondsUntilRefresh = Math.floor((timeUntilRefresh / 1000) % 60);

  console.log(
    `[TokenManager] Scheduling proactive refresh in ${minutesUntilRefresh}m ${secondsUntilRefresh}s`
  );

  refreshScheduleTimeout = setTimeout(() => {
    console.log('[TokenManager] Proactive refresh triggered by schedule');
    refreshWithRetry()
      .then((success) => {
        if (success) {
          // Schedule next refresh after successful refresh
          scheduleProactiveRefresh();
        }
      })
      .catch((error) => {
        console.error('[TokenManager] Scheduled refresh failed:', error);
      });
  }, timeUntilRefresh);

  if (DEBUG_MODE) {
    console.log('[TokenManager] Refresh scheduled for:', new Date(now.getTime() + timeUntilRefresh).toISOString());
  }
}

export const tokenManager = {
  initialize,
  getTokenExpiry,
  needsRefresh,
  storeTokenWithExpiry,
  clearTokens,
  isRefreshing,
  setRefreshing,
  getRefreshScheduleTimeout,
  setRefreshScheduleTimeout,
  refreshWithRetry,
  scheduleProactiveRefresh,
  updateLastActivity,
  getTimeSinceLastActivity,
  isInactive,
  validateAfterInactivity,
};
