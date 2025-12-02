# Implementation Plan

- [x] 1. Create Token Manager utility
  - Create new file `frontend/src/utils/tokenManager.ts` with core token management functions
  - Implement token expiry calculation from JWT payload
  - Implement `needsRefresh()` to check if token expires in < 2 minutes
  - Implement `getTokenExpiry()` to parse and return expiry date
  - Implement `storeTokenWithExpiry()` to save token and calculated expiry
  - Implement refresh state tracking (isRefreshing flag)
  - Add logging for all token operations
  - _Requirements: 1.1, 1.4, 1.5, 3.2, 5.1, 5.2, 5.3, 5.4_

- [x] 1.1 Write property test for token expiry calculation
  - **Property 1: Automatic token refresh before expiry**
  - **Validates: Requirements 1.1, 1.4, 1.5**

- [x] 2. Implement refresh with retry logic
  - Add `refreshWithRetry()` function with exponential backoff
  - Implement network error detection
  - Implement retry counter (max 2 retries)
  - Implement exponential delay calculation (1s, 2s)
  - Handle 401 from refresh endpoint (no retry)
  - Clear tokens on refresh failure
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 2.1 Write property test for retry logic
  - **Property 5: Retry with exponential backoff**
  - **Validates: Requirements 2.2**

- [x] 2.2 Write property test for 401 handling
  - **Property 6: No retry on 401 from refresh endpoint**
  - **Validates: Requirements 2.5**

- [x] 3. Enhance API client request interceptor
  - Update `frontend/src/lib/api.ts` request interceptor
  - Add proactive token freshness check before each request
  - Trigger refresh if token expires in < 2 minutes
  - Wait for refresh completion before proceeding with request
  - Preserve original request configuration
  - _Requirements: 1.1, 4.1, 4.4_

- [x] 3.1 Write property test for request payload preservation
  - **Property 8: Request payload preservation**
  - **Validates: Requirements 4.1**

- [x] 4. Implement request queuing in response interceptor
  - Update `frontend/src/lib/api.ts` response interceptor
  - Implement request queue array
  - Add `queueRequest()` function to queue failed requests
  - Add `processQueue()` function to replay queued requests
  - Ensure only one refresh executes for concurrent 401s
  - Clear queue on refresh failure
  - _Requirements: 1.2, 1.3, 3.4_

- [x] 4.1 Write property test for single refresh execution
  - **Property 3: Single refresh for concurrent requests**
  - **Validates: Requirements 1.3, 3.4**

- [x] 4.2 Write property test for request retry
  - **Property 2: Failed request retry with new token**
  - **Validates: Requirements 1.2**

- [x] 5. Implement proactive refresh scheduling
  - Add `scheduleProactiveRefresh()` function
  - Calculate time until refresh needed (expiry - 2 minutes)
  - Set timeout to trigger refresh at calculated time
  - Clear existing timeout before setting new one
  - Handle edge case where token already needs refresh
  - _Requirements: 1.1, 1.5_

- [x] 6. Add cross-tab synchronization
  - Create `frontend/src/utils/crossTabSync.ts`
  - Implement storage event listener for 'accessToken' changes
  - Implement storage event listener for token clear (logout)
  - Update local token state when other tabs change tokens
  - Trigger logout in all tabs when one tab logs out
  - _Requirements: 4.2_

- [x] 6.1 Write property test for cross-tab sync
  - **Property 9: Cross-tab token synchronization**
  - **Validates: Requirements 4.2**

- [x] 7. Implement background tab optimization
  - Add visibility change listener
  - Pause proactive refresh scheduling when tab is hidden
  - Resume scheduling when tab becomes visible
  - Validate token freshness when tab becomes visible
  - _Requirements: 4.3, 4.4_

- [x] 7.1 Write property test for background refresh suspension
  - **Property 10: Background refresh suspension**
  - **Validates: Requirements 4.3**

- [x] 8. Update token storage throughout application
  - Update `verifyOTP()` in api.ts to use `storeTokenWithExpiry()`
  - Update `login()` in api.ts to use `storeTokenWithExpiry()`
  - Update refresh success handler to use `storeTokenWithExpiry()`
  - Ensure `clearTokens()` removes accessToken, refreshToken, and tokenExpiry
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 8.1 Write property test for storage consistency
  - **Property 7: Storage consistency after refresh**
  - **Validates: Requirements 3.2, 3.3**

- [x] 9. Update TokenRefreshProvider component
  - Update `frontend/src/components/TokenRefreshProvider.tsx`
  - Initialize Token Manager on mount
  - Start proactive refresh scheduling
  - Initialize cross-tab synchronization
  - Add cleanup on unmount
  - _Requirements: 1.5, 4.2_

- [x] 10. Add comprehensive logging
  - Add console logging for token refresh success
  - Add console logging for token refresh failure with error details
  - Add console logging for token clear operations with reason
  - Add console logging for redirect to login with reason
  - Implement debug mode flag for verbose logging
  - Add debug logs for queue operations, expiry calculations, retry attempts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.1 Write property test for logging
  - **Property 13: Comprehensive operation logging**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 11. Handle server time skew
  - Update response interceptor to trust server 401 responses
  - Refresh token even if client thinks it's still valid
  - Log when server/client time disagreement detected
  - _Requirements: 4.5_

- [x] 11.1 Write property test for server-based expiry
  - **Property 12: Server-based expiry handling**
  - **Validates: Requirements 4.5**

- [x] 12. Update error handling for banned/deactivated users
  - Detect 403 responses with ban/deactivation messages
  - Clear tokens immediately
  - Show user-friendly error message
  - Redirect to login with error parameter
  - _Requirements: 2.4_

- [x] 13. Add token validation after inactivity
  - Track last activity timestamp
  - On API request, check if inactive for > 5 minutes
  - Validate token freshness if inactive
  - Trigger refresh if needed before request
  - _Requirements: 4.4_

- [x] 13.1 Write property test for inactivity validation
  - **Property 11: Token validation after inactivity**
  - **Validates: Requirements 4.4**

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Test end-to-end token refresh flow
  - Manually test login and wait for token expiry
  - Verify automatic refresh occurs
  - Verify API requests continue working
  - Test with multiple browser tabs
  - Test network interruption scenarios
  - _Requirements: All_
