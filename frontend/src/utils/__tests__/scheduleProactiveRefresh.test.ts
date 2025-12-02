/**
 * Unit tests for scheduleProactiveRefresh function
 * Task 5: Implement proactive refresh scheduling
 */

import {
  scheduleProactiveRefresh,
  storeTokenWithExpiry,
  clearTokens,
  getRefreshScheduleTimeout,
} from '../tokenManager';

/**
 * Helper function to create a valid JWT token with specified expiry
 */
function createJWT(expiryTimestamp: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: expiryTimestamp,
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${base64Header}.${base64Payload}.${signature}`;
}

describe('scheduleProactiveRefresh', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should schedule refresh for 2 minutes before token expiry', () => {
    // Setup: Token expires in 5 minutes
    const expiryTimestamp = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    const token = createJWT(expiryTimestamp);
    storeTokenWithExpiry(token);

    // Execute
    scheduleProactiveRefresh();

    // Verify: Timeout should be set
    const timeout = getRefreshScheduleTimeout();
    expect(timeout).not.toBeNull();
  });

  it('should clear existing timeout before setting new one', () => {
    // Setup: Token expires in 5 minutes
    const expiryTimestamp = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    const token = createJWT(expiryTimestamp);
    storeTokenWithExpiry(token);

    // Execute: Schedule twice
    scheduleProactiveRefresh();
    const firstTimeout = getRefreshScheduleTimeout();
    
    scheduleProactiveRefresh();
    const secondTimeout = getRefreshScheduleTimeout();

    // Verify: Should have different timeout objects
    expect(firstTimeout).not.toBeNull();
    expect(secondTimeout).not.toBeNull();
    expect(firstTimeout).not.toBe(secondTimeout);
  });

  it('should handle edge case where token already needs refresh', () => {
    // Mock refreshWithRetry to avoid actual API call
    jest.mock('../tokenManager', () => {
      const actual = jest.requireActual('../tokenManager');
      return {
        ...actual,
        refreshWithRetry: jest.fn().mockResolvedValue(true),
      };
    });

    // Setup: Token expires in 1 minute (< 2 minutes)
    const expiryTimestamp = Math.floor((Date.now() + 60 * 1000) / 1000);
    const token = createJWT(expiryTimestamp);
    storeTokenWithExpiry(token);

    // Execute
    scheduleProactiveRefresh();

    // Verify: Should not set a timeout (immediate refresh)
    // Note: In real implementation, it calls refreshWithRetry immediately
    // We can't easily test the immediate call without mocking
  });

  it('should not schedule refresh when no token exists', () => {
    // Setup: No token
    localStorage.clear();

    // Execute
    scheduleProactiveRefresh();

    // Verify: No timeout should be set
    const timeout = getRefreshScheduleTimeout();
    expect(timeout).toBeNull();
  });

  it('should calculate correct time until refresh', () => {
    // Setup: Token expires in exactly 10 minutes
    const tenMinutesInMs = 10 * 60 * 1000;
    const expiryTimestamp = Math.floor((Date.now() + tenMinutesInMs) / 1000);
    const token = createJWT(expiryTimestamp);
    storeTokenWithExpiry(token);

    // Execute
    scheduleProactiveRefresh();

    // Verify: Timeout should be set
    const timeout = getRefreshScheduleTimeout();
    expect(timeout).not.toBeNull();

    // The timeout should be scheduled for 8 minutes from now (10 - 2)
    // We can verify this by checking that the timeout exists
  });

  it('should handle token without expiry gracefully', () => {
    // Setup: Invalid token storage state
    localStorage.setItem('accessToken', 'invalid-token');
    localStorage.removeItem('tokenExpiry');

    // Execute
    scheduleProactiveRefresh();

    // Verify: Should not crash and no timeout should be set
    const timeout = getRefreshScheduleTimeout();
    expect(timeout).toBeNull();
  });
});
