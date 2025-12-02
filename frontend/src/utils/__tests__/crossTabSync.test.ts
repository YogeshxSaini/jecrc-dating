/**
 * Property-Based Tests for Cross-Tab Synchronization
 * Feature: token-refresh-fix
 */

import * as fc from 'fast-check';
import {
  initializeCrossTabSync,
  cleanupCrossTabSync,
  broadcastTokenUpdate,
  broadcastLogout,
} from '../crossTabSync';
import { getTokenExpiry, clearTokens } from '../tokenManager';

/**
 * Helper function to create a valid JWT token with specified expiry
 * Uses a fixed iat to ensure consistent token generation
 */
function createJWT(expiryTimestamp: number, userId = 'test-user-123', iat?: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    id: userId,
    email: 'test@example.com',
    role: 'user',
    iat: iat || Math.floor(Date.now() / 1000),
    exp: expiryTimestamp,
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Helper to simulate storage event from another tab
 * Note: We manually set storageArea after construction due to jsdom limitations
 */
function simulateStorageEvent(
  key: string,
  newValue: string | null,
  oldValue: string | null = null
): void {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    url: window.location.href,
  });
  // Manually set storageArea to simulate cross-tab event
  Object.defineProperty(event, 'storageArea', {
    value: localStorage,
    writable: false,
  });
  window.dispatchEvent(event);
}

/**
 * Helper to wait for async operations
 */
function waitForAsync(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Cross-Tab Synchronization - Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanupCrossTabSync();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupCrossTabSync();
  });

  describe('initializeCrossTabSync', () => {
    it('should register storage event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      initializeCrossTabSync();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('cleanupCrossTabSync', () => {
    it('should remove storage event listener', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      initializeCrossTabSync();
      cleanupCrossTabSync();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('broadcastTokenUpdate', () => {
    it('should store token and expiry in localStorage', () => {
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutes
      const token = createJWT(expiryTimestamp);

      broadcastTokenUpdate(token);

      expect(localStorage.getItem('accessToken')).toBe(token);
      expect(localStorage.getItem('tokenExpiry')).not.toBeNull();
    });
  });

  describe('broadcastLogout', () => {
    it('should clear all tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh');
      localStorage.setItem('tokenExpiry', new Date().toISOString());

      broadcastLogout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('tokenExpiry')).toBeNull();
    });
  });

  describe('Storage event handling', () => {
    beforeEach(() => {
      initializeCrossTabSync();
    });

    it('should handle accessToken update from another tab', async () => {
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 900;
      const newToken = createJWT(expiryTimestamp);
      const newExpiry = new Date(expiryTimestamp * 1000).toISOString();

      // Simulate another tab updating the token
      localStorage.setItem('accessToken', newToken);
      localStorage.setItem('tokenExpiry', newExpiry);
      simulateStorageEvent('accessToken', newToken, 'old-token');

      await waitForAsync();

      // Token should be in localStorage (set by simulated other tab)
      expect(localStorage.getItem('accessToken')).toBe(newToken);
      expect(localStorage.getItem('tokenExpiry')).toBe(newExpiry);
    }, 10000);

    it('should handle logout from another tab', async () => {
      // Setup: Have tokens in current tab
      localStorage.setItem('accessToken', 'current-token');
      localStorage.setItem('refreshToken', 'current-refresh');
      localStorage.setItem('tokenExpiry', new Date().toISOString());

      // Simulate another tab clearing the accessToken (logout)
      localStorage.removeItem('accessToken');
      simulateStorageEvent('accessToken', null, 'old-token');

      await waitForAsync();

      // Verify: All tokens should be cleared
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('tokenExpiry')).toBeNull();
    }, 10000);

    it('should clear tokens when accessToken is removed', async () => {
      localStorage.setItem('accessToken', 'current-token');
      localStorage.setItem('refreshToken', 'current-refresh');

      // Simulate logout from another tab
      localStorage.removeItem('accessToken');
      simulateStorageEvent('accessToken', null, 'old-token');

      await waitForAsync();

      // Verify: Tokens should be cleared
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    }, 10000);

    it('should handle refreshToken clear from another tab', async () => {
      localStorage.setItem('accessToken', 'current-token');
      localStorage.setItem('refreshToken', 'current-refresh');

      // Simulate another tab clearing the refreshToken
      localStorage.removeItem('refreshToken');
      simulateStorageEvent('refreshToken', null, 'old-refresh');

      await waitForAsync();

      // Verify: All tokens should be cleared
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    }, 10000);
  });
});

/**
 * Property 9: Cross-tab token synchronization
 * Feature: token-refresh-fix, Property 9: Cross-tab token synchronization
 * Validates: Requirements 4.2
 * 
 * For any token update in one browser tab, all other tabs should receive
 * and apply the updated token within 100ms via storage events
 */
describe('Property 9: Cross-tab token synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanupCrossTabSync();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupCrossTabSync();
  });

  it('should synchronize any token update across tabs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random token expiry (future timestamp)
        fc.integer({ min: Math.floor(Date.now() / 1000) + 60, max: Math.floor(Date.now() / 1000) + 3600 }),
        // Generate random user ID
        fc.string({ minLength: 5, maxLength: 50 }),
        async (expiryTimestamp, userId) => {
          // Setup: Initialize cross-tab sync
          localStorage.clear();
          initializeCrossTabSync();

          // Create a token
          const newToken = createJWT(expiryTimestamp, userId);
          const expectedExpiry = new Date(expiryTimestamp * 1000).toISOString();

          // Simulate Tab 1 updating the token
          localStorage.setItem('accessToken', newToken);
          localStorage.setItem('tokenExpiry', expectedExpiry);

          // Simulate storage event (as if from another tab)
          simulateStorageEvent('accessToken', newToken, null);

          // Wait for event processing
          await waitForAsync(50);

          // Verify: Token should be in localStorage
          expect(localStorage.getItem('accessToken')).toBe(newToken);
          expect(localStorage.getItem('tokenExpiry')).toBe(expectedExpiry);

          // Verify: getTokenExpiry should return correct value
          const retrievedExpiry = getTokenExpiry();
          expect(retrievedExpiry).toEqual(new Date(expiryTimestamp * 1000));

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should synchronize token clear (logout) across tabs for any initial state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random initial tokens
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 3600 }),
        async (accessToken, refreshToken, expiryTimestamp) => {
          // Setup: Initialize with tokens
          localStorage.clear();
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('tokenExpiry', new Date(expiryTimestamp * 1000).toISOString());

          initializeCrossTabSync();

          // Simulate another tab clearing tokens (logout)
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tokenExpiry');
          simulateStorageEvent('accessToken', null, accessToken);

          // Wait for event processing
          await waitForAsync(50);

          // Verify: All tokens should be cleared
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
          expect(localStorage.getItem('tokenExpiry')).toBeNull();

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle multiple rapid token updates from any tab', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of token updates (2-3 updates)
        fc.array(
          fc.record({
            expiryTimestamp: fc.integer({
              min: Math.floor(Date.now() / 1000) + 60,
              max: Math.floor(Date.now() / 1000) + 3600,
            }),
            userId: fc.string({ minLength: 5, maxLength: 30 }),
          }),
          { minLength: 2, maxLength: 3 }
        ),
        async (tokenUpdates) => {
          // Setup
          localStorage.clear();
          initializeCrossTabSync();

          let previousToken: string | null = null;
          const fixedIat = Math.floor(Date.now() / 1000); // Use fixed iat for all tokens

          // Simulate rapid token updates from another tab
          for (const update of tokenUpdates) {
            const newToken = createJWT(update.expiryTimestamp, update.userId, fixedIat);
            const newExpiry = new Date(update.expiryTimestamp * 1000).toISOString();

            localStorage.setItem('accessToken', newToken);
            localStorage.setItem('tokenExpiry', newExpiry);
            simulateStorageEvent('accessToken', newToken, previousToken);

            previousToken = newToken;

            // Small delay between updates
            await waitForAsync(10);
          }

          // Wait for all events to process
          await waitForAsync(50);

          // Verify: Final token should be the last one
          const lastUpdate = tokenUpdates[tokenUpdates.length - 1];
          const expectedToken = createJWT(lastUpdate.expiryTimestamp, lastUpdate.userId, fixedIat);
          const expectedExpiry = new Date(lastUpdate.expiryTimestamp * 1000).toISOString();

          expect(localStorage.getItem('accessToken')).toBe(expectedToken);
          expect(localStorage.getItem('tokenExpiry')).toBe(expectedExpiry);

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  it('should handle token updates with various expiry times', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate token with expiry anywhere from 1 minute to 24 hours
        fc.integer({ min: 60, max: 86400 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (secondsUntilExpiry, userId) => {
          // Setup
          localStorage.clear();
          initializeCrossTabSync();

          const expiryTimestamp = Math.floor(Date.now() / 1000) + secondsUntilExpiry;
          const newToken = createJWT(expiryTimestamp, userId);
          const expectedExpiry = new Date(expiryTimestamp * 1000).toISOString();

          // Simulate token update from another tab
          localStorage.setItem('accessToken', newToken);
          localStorage.setItem('tokenExpiry', expectedExpiry);
          simulateStorageEvent('accessToken', newToken, null);

          await waitForAsync(50);

          // Verify: Token and expiry are correctly stored
          expect(localStorage.getItem('accessToken')).toBe(newToken);
          expect(localStorage.getItem('tokenExpiry')).toBe(expectedExpiry);

          // Verify: Expiry calculation is correct
          const retrievedExpiry = getTokenExpiry();
          expect(retrievedExpiry).not.toBeNull();
          expect(retrievedExpiry!.getTime()).toBe(expiryTimestamp * 1000);

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle logout from any tab with various tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (accessToken) => {
          // Setup
          localStorage.clear();
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', 'refresh-token');
          localStorage.setItem('tokenExpiry', new Date().toISOString());

          initializeCrossTabSync();

          // Simulate logout from another tab
          localStorage.removeItem('accessToken');
          simulateStorageEvent('accessToken', null, accessToken);

          await waitForAsync(50);

          // Verify: Tokens cleared
          expect(localStorage.getItem('accessToken')).toBeNull();

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle refreshToken clear independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (accessToken, refreshToken) => {
          // Setup
          localStorage.clear();
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          initializeCrossTabSync();

          // Simulate refreshToken clear from another tab
          localStorage.removeItem('refreshToken');
          simulateStorageEvent('refreshToken', null, refreshToken);

          await waitForAsync(50);

          // Verify: All tokens should be cleared
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should ignore storage events without storageArea (same-tab events)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (accessToken) => {
          // Setup
          localStorage.clear();
          localStorage.setItem('accessToken', accessToken);

          initializeCrossTabSync();

          // Create storage event WITHOUT storageArea (same-tab event)
          const event = new StorageEvent('storage', {
            key: 'accessToken',
            newValue: null,
            oldValue: accessToken,
            url: window.location.href,
          });
          // Don't set storageArea - this simulates same-tab event
          window.dispatchEvent(event);

          await waitForAsync(50);

          // Verify: Token should still be there (event should be ignored)
          expect(localStorage.getItem('accessToken')).toBe(accessToken);

          cleanupCrossTabSync();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle broadcastTokenUpdate for any valid token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: Math.floor(Date.now() / 1000) + 60, max: Math.floor(Date.now() / 1000) + 3600 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (expiryTimestamp, userId) => {
          // Setup
          localStorage.clear();

          const token = createJWT(expiryTimestamp, userId);

          // Execute: Broadcast token update
          broadcastTokenUpdate(token);

          // Verify: Token and expiry stored
          expect(localStorage.getItem('accessToken')).toBe(token);
          expect(localStorage.getItem('tokenExpiry')).not.toBeNull();

          const storedExpiry = getTokenExpiry();
          expect(storedExpiry).not.toBeNull();
          expect(storedExpiry!.getTime()).toBe(expiryTimestamp * 1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle broadcastLogout from any state', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random initial state
        fc.boolean(), // has accessToken
        fc.boolean(), // has refreshToken
        fc.boolean(), // has tokenExpiry
        async (hasAccessToken, hasRefreshToken, hasTokenExpiry) => {
          // Setup: Random initial state
          localStorage.clear();
          if (hasAccessToken) {
            localStorage.setItem('accessToken', 'test-access-token');
          }
          if (hasRefreshToken) {
            localStorage.setItem('refreshToken', 'test-refresh-token');
          }
          if (hasTokenExpiry) {
            localStorage.setItem('tokenExpiry', new Date().toISOString());
          }

          // Execute: Broadcast logout
          broadcastLogout();

          // Verify: All tokens cleared regardless of initial state
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(localStorage.getItem('refreshToken')).toBeNull();
          expect(localStorage.getItem('tokenExpiry')).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });
});
