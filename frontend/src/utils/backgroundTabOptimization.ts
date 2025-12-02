/**
 * Background Tab Optimization
 * Pauses token refresh scheduling when tab is hidden
 * Validates token freshness when tab becomes visible
 */

import { scheduleProactiveRefresh, getRefreshScheduleTimeout, setRefreshScheduleTimeout, needsRefresh, refreshWithRetry } from './tokenManager';

// Debug mode flag for verbose logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Track visibility change listener for cleanup
let visibilityChangeListener: (() => void) | null = null;

// Custom callbacks for testing
let customScheduleCallback: (() => void) | null = null;
let customClearCallback: (() => void) | null = null;
let customValidateCallback: (() => void) | null = null;

/**
 * Handle visibility change events
 * Pauses refresh scheduling when tab is hidden
 * Resumes scheduling and validates token when tab becomes visible
 */
export function handleVisibilityChange(): void {
  if (typeof document === 'undefined') return;

  const isHidden = document.hidden;

  if (isHidden) {
    // Tab is now hidden - pause proactive refresh scheduling
    if (DEBUG_MODE) {
      console.log('[BackgroundOptimization] Tab hidden, pausing refresh scheduling');
    }

    // Clear any scheduled refresh
    const currentTimeout = getRefreshScheduleTimeout();
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      setRefreshScheduleTimeout(null);
      if (DEBUG_MODE) {
        console.log('[BackgroundOptimization] Cleared scheduled refresh');
      }
    }

    // Call custom clear callback if provided (for testing)
    if (customClearCallback) {
      customClearCallback();
    }
  } else {
    // Tab is now visible - resume scheduling and validate token
    if (DEBUG_MODE) {
      console.log('[BackgroundOptimization] Tab visible, resuming refresh scheduling');
    }

    // Check if we have a token before proceeding
    if (typeof window !== 'undefined') {
      const hasToken = localStorage.getItem('accessToken');
      
      if (!hasToken) {
        if (DEBUG_MODE) {
          console.log('[BackgroundOptimization] No token found, skipping refresh scheduling');
        }
        return;
      }
    }

    // Validate token freshness
    if (DEBUG_MODE) {
      console.log('[BackgroundOptimization] Validating token freshness');
    }

    // Call custom validate callback if provided (for testing)
    if (customValidateCallback) {
      customValidateCallback();
    }

    // Always schedule refresh when tab becomes visible (if token exists)
    // The scheduling mechanism itself will handle checking if refresh is needed
    if (customScheduleCallback) {
      customScheduleCallback();
    } else {
      scheduleProactiveRefresh();
    }
  }
}

/**
 * Initialize background tab optimization
 * Sets up visibility change listener
 * 
 * @param scheduleCallback - Optional custom schedule callback for testing
 * @param clearCallback - Optional custom clear callback for testing
 * @param validateCallback - Optional custom validate callback for testing
 */
export function initializeBackgroundOptimization(
  scheduleCallback?: () => void,
  clearCallback?: () => void,
  validateCallback?: () => void
): void {
  if (typeof document === 'undefined') return;

  // Store custom callbacks for testing
  customScheduleCallback = scheduleCallback || null;
  customClearCallback = clearCallback || null;
  customValidateCallback = validateCallback || null;

  // Clean up existing listener if any
  if (visibilityChangeListener) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
  }

  // Create and store the listener
  visibilityChangeListener = handleVisibilityChange;

  // Add visibility change listener
  document.addEventListener('visibilitychange', visibilityChangeListener);

  console.log('[BackgroundOptimization] Background tab optimization initialized');

  if (DEBUG_MODE) {
    console.log('[BackgroundOptimization] Visibility change listener added');
    console.log('[BackgroundOptimization] Current visibility state:', document.hidden ? 'hidden' : 'visible');
  }

  // If tab is currently hidden, don't schedule refresh
  // If tab is visible, the normal scheduling will handle it
  if (document.hidden) {
    if (DEBUG_MODE) {
      console.log('[BackgroundOptimization] Tab is hidden on initialization, refresh scheduling paused');
    }
  }
}

/**
 * Cleanup background tab optimization
 * Removes visibility change listener
 */
export function cleanupBackgroundOptimization(): void {
  if (typeof document === 'undefined') return;

  if (visibilityChangeListener) {
    document.removeEventListener('visibilitychange', visibilityChangeListener);
    visibilityChangeListener = null;

    if (DEBUG_MODE) {
      console.log('[BackgroundOptimization] Visibility change listener removed');
    }
  }

  // Clear custom callbacks
  customScheduleCallback = null;
  customClearCallback = null;
  customValidateCallback = null;

  console.log('[BackgroundOptimization] Background tab optimization cleaned up');
}

/**
 * Check if tab is currently hidden
 */
export function isTabHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden;
}
