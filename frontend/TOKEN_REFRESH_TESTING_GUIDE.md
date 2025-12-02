# Token Refresh End-to-End Testing Guide

This guide provides step-by-step instructions for manually testing the token refresh functionality implemented in the dating application.

## Prerequisites

Before testing, ensure:
1. Backend server is running (`npm run dev` in `/backend`)
2. Frontend server is running (`npm run dev` in `/frontend`)
3. You have valid test user credentials
4. Browser DevTools are open (Console and Network tabs)

## Test Scenarios

### 1. Automatic Token Refresh Before Expiry

**Objective**: Verify that tokens are automatically refreshed 2 minutes before expiry

**Steps**:
1. Open browser DevTools Console
2. Login to the application
3. Note the login timestamp in console logs
4. Wait approximately 13 minutes (tokens expire at 15 minutes, refresh at 13 minutes)
5. Observe console logs for proactive refresh message
6. Make an API request (e.g., navigate to profile page)
7. Verify the request succeeds without errors

**Expected Results**:
- Console shows: `[TokenManager] Proactive token refresh triggered`
- Console shows: `[TokenManager] Token refreshed successfully`
- API requests continue working seamlessly
- No "invalid token" errors appear
- User remains logged in

**Pass Criteria**: ✅ Token refreshes automatically and user experiences no interruption

---

### 2. Token Refresh on API Request with Expired Token

**Objective**: Verify that expired tokens are refreshed when making API requests

**Steps**:
1. Login to the application
2. Open DevTools > Application > Local Storage
3. Manually modify `tokenExpiry` to a past date (e.g., 1 hour ago)
4. Navigate to any page that makes API requests (e.g., Discover page)
5. Observe Network tab and Console

**Expected Results**:
- Console shows: `[TokenManager] Token needs refresh`
- Console shows: `[TokenManager] Token refreshed successfully`
- API request succeeds after refresh
- Page loads correctly with data

**Pass Criteria**: ✅ Token refreshes automatically before API request proceeds

---

### 3. Multiple Concurrent Requests with Expired Token

**Objective**: Verify that only one refresh occurs for multiple simultaneous requests

**Steps**:
1. Login to the application
2. Modify `tokenExpiry` to a past date in Local Storage
3. Quickly navigate to a page with multiple API calls (e.g., Dashboard)
4. Open Network tab and filter for `/api/auth/refresh`
5. Count the number of refresh requests

**Expected Results**:
- Only ONE `/api/auth/refresh` request appears
- Console shows: `[TokenManager] Refresh already in progress, queuing request`
- All API requests eventually succeed
- No duplicate refresh calls

**Pass Criteria**: ✅ Exactly one refresh request for multiple concurrent API calls

---

### 4. Cross-Tab Token Synchronization

**Objective**: Verify tokens sync across multiple browser tabs

**Steps**:
1. Open the application in Tab 1 and login
2. Open the application in Tab 2 (same browser)
3. In Tab 1, wait for automatic token refresh (or trigger manually)
4. Observe Tab 2 console logs
5. Make an API request in Tab 2

**Expected Results**:
- Tab 2 console shows: `[CrossTabSync] Token updated from another tab`
- Tab 2 uses the new token automatically
- Both tabs remain logged in and functional

**Pass Criteria**: ✅ Token updates propagate to all open tabs

---

### 5. Cross-Tab Logout Synchronization

**Objective**: Verify logout in one tab logs out all tabs

**Steps**:
1. Open the application in 3 different tabs
2. Login in all tabs
3. Logout from Tab 1
4. Observe Tabs 2 and 3

**Expected Results**:
- Tabs 2 and 3 console show: `[CrossTabSync] Logout detected from another tab`
- Tabs 2 and 3 automatically redirect to login page
- All tabs clear their tokens

**Pass Criteria**: ✅ Logout in one tab logs out all tabs

---

### 6. Network Interruption During Refresh

**Objective**: Verify retry logic with exponential backoff

**Steps**:
1. Login to the application
2. Open DevTools > Network tab
3. Enable "Offline" mode in Network tab
4. Modify `tokenExpiry` to trigger refresh
5. Navigate to a page (triggers API request)
6. Wait 1 second, then disable "Offline" mode
7. Observe console logs and network requests

**Expected Results**:
- Console shows: `[TokenManager] Refresh attempt 1 failed, retrying...`
- Console shows retry attempts with delays (1s, 2s)
- After network restored, refresh succeeds
- Original API request completes successfully

**Pass Criteria**: ✅ System retries failed refresh with exponential backoff

---

### 7. Refresh Token Expired (401 from Refresh Endpoint)

**Objective**: Verify proper handling when refresh token is invalid

**Steps**:
1. Login to the application
2. Open DevTools > Application > Local Storage
3. Modify `refreshToken` to an invalid value (e.g., "invalid_token")
4. Modify `tokenExpiry` to trigger refresh
5. Navigate to any page

**Expected Results**:
- Console shows: `[TokenManager] Refresh token invalid or expired`
- Console shows: `[TokenManager] Tokens cleared, redirecting to login`
- User is redirected to `/login`
- All tokens are cleared from Local Storage
- No retry attempts (immediate failure on 401)

**Pass Criteria**: ✅ Invalid refresh token immediately clears session and redirects

---

### 8. Background Tab Optimization

**Objective**: Verify refresh scheduling pauses in background tabs

**Steps**:
1. Login to the application
2. Open DevTools Console
3. Switch to a different tab (make the app tab background)
4. Wait for 1 minute
5. Switch back to the app tab
6. Observe console logs

**Expected Results**:
- Console shows: `[BackgroundTab] Tab hidden, pausing proactive refresh`
- No refresh attempts while tab is hidden
- Console shows: `[BackgroundTab] Tab visible, resuming proactive refresh`
- Token freshness validated when tab becomes visible

**Pass Criteria**: ✅ No unnecessary refreshes in background tabs

---

### 9. Token Validation After Inactivity

**Objective**: Verify token validation after 5+ minutes of inactivity

**Steps**:
1. Login to the application
2. Leave the application idle for 6 minutes (no interactions)
3. Make an API request (e.g., click on a profile)
4. Observe console logs

**Expected Results**:
- Console shows: `[TokenManager] Inactive for >5 minutes, validating token`
- If token needs refresh, it refreshes before request
- API request succeeds

**Pass Criteria**: ✅ Token validated after extended inactivity

---

### 10. Request Payload Preservation During Refresh

**Objective**: Verify original request data is preserved during token refresh

**Steps**:
1. Login to the application
2. Navigate to profile edit page
3. Modify `tokenExpiry` to trigger refresh
4. Submit a profile update with specific data
5. Observe Network tab for the update request
6. Verify the data was saved correctly

**Expected Results**:
- Token refresh occurs before profile update
- Profile update request contains all original data
- Profile updates successfully
- No data loss during refresh

**Pass Criteria**: ✅ Request payload and headers preserved during refresh

---

### 11. Server Time Skew Handling

**Objective**: Verify system trusts server 401 responses over client time

**Steps**:
1. Login to the application
2. Modify `tokenExpiry` to a future date (e.g., 1 hour from now)
3. In backend, manually expire the token or modify JWT secret temporarily
4. Make an API request
5. Observe behavior

**Expected Results**:
- Despite client thinking token is valid, server returns 401
- Console shows: `[TokenManager] Server rejected token, refreshing`
- Token refresh occurs
- Request succeeds after refresh

**Pass Criteria**: ✅ Server 401 response triggers refresh regardless of client expiry

---

### 12. Comprehensive Logging Verification

**Objective**: Verify all token operations are properly logged

**Steps**:
1. Login to the application
2. Trigger various scenarios (refresh, logout, errors)
3. Review console logs for completeness

**Expected Log Messages**:
- `[TokenManager] Token refreshed successfully`
- `[TokenManager] Token refresh failed: <reason>`
- `[TokenManager] Tokens cleared: <reason>`
- `[TokenManager] Redirecting to login: <reason>`
- `[TokenManager] Proactive token refresh triggered`
- `[CrossTabSync] Token updated from another tab`
- `[CrossTabSync] Logout detected from another tab`
- `[BackgroundTab] Tab hidden/visible`

**Pass Criteria**: ✅ All operations logged with context and timestamps

---

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] 1. Automatic token refresh before expiry
- [ ] 2. Token refresh on API request with expired token
- [ ] 3. Multiple concurrent requests with expired token
- [ ] 4. Cross-tab token synchronization
- [ ] 5. Cross-tab logout synchronization
- [ ] 6. Network interruption during refresh
- [ ] 7. Refresh token expired (401 from refresh endpoint)
- [ ] 8. Background tab optimization
- [ ] 9. Token validation after inactivity
- [ ] 10. Request payload preservation during refresh
- [ ] 11. Server time skew handling
- [ ] 12. Comprehensive logging verification

## Common Issues and Troubleshooting

### Issue: Token refresh not triggering
**Solution**: Check that `TokenRefreshProvider` is properly mounted in the app layout

### Issue: Cross-tab sync not working
**Solution**: Ensure both tabs are on the same origin (same protocol, domain, port)

### Issue: Excessive console logs
**Solution**: Debug mode can be disabled by setting `DEBUG_TOKEN_MANAGER = false` in tokenManager.ts

### Issue: Tests timing out
**Solution**: Token expiry is 15 minutes - use Local Storage manipulation to speed up testing

## Performance Metrics

Track these metrics during testing:

- **Refresh Latency**: Time from refresh trigger to completion (should be < 500ms)
- **Request Queue Processing**: Time to process queued requests (should be < 100ms)
- **Cross-Tab Sync Delay**: Time for token update to propagate (should be < 100ms)
- **Background Tab Resume**: Time to validate token on tab focus (should be < 200ms)

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Console logs (full output)
3. Network tab screenshot
4. Local Storage state
5. Steps to reproduce
6. Expected vs actual behavior

## Success Criteria

The token refresh implementation is considered successful when:
- ✅ All 12 test scenarios pass
- ✅ No "invalid token" errors occur during normal usage
- ✅ Users experience seamless authentication
- ✅ All operations are properly logged
- ✅ Cross-tab synchronization works reliably
- ✅ Network failures are handled gracefully
