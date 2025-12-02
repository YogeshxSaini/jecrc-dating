/**
 * Cross-Tab Synchronization
 * Keeps tokens synchronized across browser tabs using localStorage events
 * Ensures all tabs stay in sync when tokens are updated or cleared
 */

import { storeTokenWithExpiry, clearTokens } from './tokenManager';

const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Initialize cross-tab synchronization
 * Sets up storage event listeners to sync token changes across tabs
 */
export function initializeCrossTabSync(): void {
  if (typeof window === 'undefined') {
    console.warn('[CrossTabSync] Cannot initialize: not in browser environment');
    return;
  }

  console.log('[CrossTabSync] Initializing cross-tab synchronization');

  // Listen for storage events from other tabs
  window.addEventListener('storage', handleStorageEvent);

  if (DEBUG_MODE) {
    console.log('[CrossTabSync] Storage event listener registered');
  }
}

/**
 * Clean up cross-tab synchronization
 * Removes event listeners
 */
export function cleanupCrossTabSync(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('storage', handleStorageEvent);

  if (DEBUG_MODE) {
    console.log('[CrossTabSync] Storage event listener removed');
  }
}

/**
 * Handle storage events from other tabs
 * Synchronizes token updates and logout actions
 */
function handleStorageEvent(event: StorageEvent): void {
  // Only handle events from other tabs (event.storageArea will be set)
  if (!event.storageArea) return;

  if (DEBUG_MODE) {
    console.log('[CrossTabSync] Storage event received:', {
      key: event.key,
      hasNewValue: !!event.newValue,
      hasOldValue: !!event.oldValue,
    });
  }

  // Handle accessToken changes
  if (event.key === 'accessToken') {
    if (event.newValue && event.newValue !== event.oldValue) {
      // Token updated in another tab - update local state
      console.log('[CrossTabSync] Access token updated in another tab, syncing locally');
      
      // The token is already in localStorage (set by other tab)
      // We just need to ensure tokenExpiry is also synced
      const tokenExpiry = localStorage.getItem('tokenExpiry');
      
      if (DEBUG_MODE) {
        console.log('[CrossTabSync] Token synced, expiry:', tokenExpiry);
      }
    } else if (!event.newValue && event.oldValue) {
      // Token cleared in another tab (logout) - clear local state
      console.log('[CrossTabSync] Access token cleared in another tab, logging out locally');
      handleLogoutFromOtherTab();
    }
  }

  // Handle tokenExpiry changes
  if (event.key === 'tokenExpiry') {
    if (event.newValue && event.newValue !== event.oldValue) {
      if (DEBUG_MODE) {
        console.log('[CrossTabSync] Token expiry updated in another tab:', event.newValue);
      }
    }
  }

  // Handle refreshToken changes
  if (event.key === 'refreshToken') {
    if (!event.newValue && event.oldValue) {
      // Refresh token cleared - this is a logout
      console.log('[CrossTabSync] Refresh token cleared in another tab, logging out locally');
      handleLogoutFromOtherTab();
    }
  }
}

/**
 * Handle logout that occurred in another tab
 * Clears local tokens and redirects to login
 */
function handleLogoutFromOtherTab(): void {
  console.log('[CrossTabSync] Handling logout from another tab');

  // Clear any remaining tokens (in case only some were cleared)
  clearTokens('Logout from another tab');

  // Redirect to login page
  if (typeof window !== 'undefined') {
    // Check if we're not already on the login page
    if (!window.location.pathname.includes('/login')) {
      console.log('[CrossTabSync] Redirecting to login page');
      window.location.href = '/login';
    }
  }
}

/**
 * Broadcast token update to other tabs
 * This happens automatically via localStorage, but we can use this
 * to ensure the update is properly propagated
 */
export function broadcastTokenUpdate(accessToken: string): void {
  if (typeof window === 'undefined') return;

  // Store the token (this will trigger storage events in other tabs)
  storeTokenWithExpiry(accessToken);

  if (DEBUG_MODE) {
    console.log('[CrossTabSync] Token update broadcasted to other tabs');
  }
}

/**
 * Broadcast logout to other tabs
 * Clears tokens which will trigger storage events in other tabs
 */
export function broadcastLogout(): void {
  if (typeof window === 'undefined') return;

  console.log('[CrossTabSync] Broadcasting logout to other tabs');

  // Clear tokens (this will trigger storage events in other tabs)
  clearTokens('Logout initiated');

  if (DEBUG_MODE) {
    console.log('[CrossTabSync] Logout broadcasted to other tabs');
  }
}

export const crossTabSync = {
  initialize: initializeCrossTabSync,
  cleanup: cleanupCrossTabSync,
  broadcastTokenUpdate,
  broadcastLogout,
};
