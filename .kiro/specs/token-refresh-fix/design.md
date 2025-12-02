# Design Document: Token Refresh Fix

## Overview

This design implements a robust, production-ready token refresh system that eliminates the "invalid token" errors users experience. The solution includes proactive token refresh, request queuing during refresh operations, cross-tab synchronization, and comprehensive error handling. The design focuses on minimal code changes while maximizing reliability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Token Manager (New Component)                │ │
│  │  - Proactive refresh scheduling                        │ │
│  │  - Token validation                                    │ │
│  │  - Cross-tab synchronization                           │ │
│  │  - Refresh state management                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Client (Enhanced)                     │ │
│  │  - Request interceptor (add token)                     │ │
│  │  - Response interceptor (handle 401)                   │ │
│  │  - Request queue during refresh                        │ │
│  │  - Retry logic with backoff                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Local Storage                             │ │
│  │  - accessToken                                         │ │
│  │  - refreshToken                                        │ │
│  │  - tokenExpiry (new)                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  POST /api/auth/refresh                                      │
│  - Validates refresh token                                   │
│  - Returns new access token                                  │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Proactive Refresh**: Token Manager checks token expiry every minute and refreshes if < 2 minutes remaining
2. **Reactive Refresh**: API Client intercepts 401 responses and triggers refresh
3. **Request Queuing**: During refresh, all API requests are queued and replayed after success
4. **Cross-Tab Sync**: Storage events synchronize token updates across browser tabs

## Components and Interfaces

### 1. Token Manager (New)

**Purpose**: Centralized token lifecycle management

**Interface**:
```typescript
interface TokenManager {
  // Initialize token management
  initialize(): void;
  
  // Check if token needs refresh (< 2 min remaining)
  needsRefresh(): boolean;
  
  // Get token expiry time
  getTokenExpiry(): Date | null;
  
  // Refresh token with retry logic
  refreshToken(): Promise<boolean>;
  
  // Schedule proactive refresh
  scheduleRefresh(): void;
  
  // Clear all tokens and state
  clearTokens(): void;
  
  // Check if refresh is in progress
  isRefreshing(): boolean;
}
```

**Key Features**:
- Stores token expiry timestamp in localStorage
- Calculates expiry from JWT payload on token receipt
- Schedules refresh 2 minutes before expiry
- Prevents concurrent refresh operations
- Implements exponential backoff for retries

### 2. Enhanced API Client

**Purpose**: HTTP client with intelligent token handling

**Interface**:
```typescript
interface ApiClient {
  // Existing methods remain unchanged
  
  // Internal: Queue request during refresh
  private queueRequest(config: AxiosRequestConfig): Promise<any>;
  
  // Internal: Process queued requests
  private processQueue(error: Error | null, token: string | null): void;
  
  // Internal: Handle 401 with refresh
  private handle401(error: AxiosError): Promise<any>;
}
```

**Enhanced Interceptors**:

**Request Interceptor**:
- Check if token needs proactive refresh before request
- Add Authorization header with current token
- Queue request if refresh is in progress

**Response Interceptor**:
- Detect 401 errors
- Trigger token refresh (only once for concurrent requests)
- Replay failed requests with new token
- Handle refresh failures gracefully

### 3. Cross-Tab Synchronization

**Purpose**: Keep tokens synchronized across browser tabs

**Implementation**:
```typescript
// Listen for storage events
window.addEventListener('storage', (event) => {
  if (event.key === 'accessToken' && event.newValue) {
    // Token updated in another tab
    updateLocalToken(event.newValue);
  }
  if (event.key === 'accessToken' && !event.newValue) {
    // Token cleared in another tab (logout)
    handleLogout();
  }
});
```

## Data Models

### Token Storage Schema

```typescript
// localStorage keys
interface TokenStorage {
  accessToken: string;        // JWT access token
  refreshToken: string;       // JWT refresh token
  tokenExpiry: string;        // ISO timestamp of access token expiry
}
```

### Token Payload

```typescript
interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number;  // Issued at (Unix timestamp)
  exp: number;  // Expiry (Unix timestamp)
}

interface RefreshTokenPayload {
  id: string;
  iat: number;
  exp: number;
}
```

### Request Queue Entry

```typescript
interface QueuedRequest {
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all identified properties, several can be consolidated:

- Properties 1.1, 1.4, and 1.5 all test proactive refresh behavior and can be combined
- Properties 3.2 and 3.3 both test storage consistency and can be combined
- Properties 5.1, 5.2, 5.3, and 5.4 all test logging and can be combined into comprehensive logging tests
- Property 1.3 and 3.4 both test single refresh execution and can be combined

This reduces redundancy while maintaining comprehensive coverage.

### Correctness Properties

Property 1: Automatic token refresh before expiry
*For any* API request made when the access token has less than 2 minutes until expiry, the system should automatically refresh the token before executing the request
**Validates: Requirements 1.1, 1.4, 1.5**

Property 2: Failed request retry with new token
*For any* API request that receives a 401 response, after successful token refresh, the system should retry the original request with the new access token and return the result
**Validates: Requirements 1.2**

Property 3: Single refresh for concurrent requests
*For any* set of concurrent API requests made with an expired token, the system should execute exactly one token refresh operation and queue all other requests until completion
**Validates: Requirements 1.3, 3.4**

Property 4: Token cleanup on refresh failure
*For any* refresh token that is invalid or expired, the system should clear all stored tokens (accessToken, refreshToken, tokenExpiry) from localStorage
**Validates: Requirements 2.1**

Property 5: Retry with exponential backoff
*For any* token refresh that fails due to network error, the system should retry up to 2 additional times with exponentially increasing delays (1s, 2s)
**Validates: Requirements 2.2**

Property 6: No retry on 401 from refresh endpoint
*For any* refresh request that returns a 401 status code, the system should immediately clear tokens and redirect without attempting retries
**Validates: Requirements 2.5**

Property 7: Storage consistency after refresh
*For any* successful token refresh, all storage locations (localStorage accessToken, tokenExpiry) should be updated atomically with the new values
**Validates: Requirements 3.2, 3.3**

Property 8: Request payload preservation
*For any* API request with payload and headers that triggers a token refresh, the retried request should contain identical payload and headers to the original
**Validates: Requirements 4.1**

Property 9: Cross-tab token synchronization
*For any* token update in one browser tab, all other tabs should receive and apply the updated token within 100ms via storage events
**Validates: Requirements 4.2**

Property 10: Background refresh suspension
*For any* application tab in background state (document.hidden === true), the system should not schedule proactive token refreshes
**Validates: Requirements 4.3**

Property 11: Token validation after inactivity
*For any* API request made after the application has been inactive for more than 5 minutes, the system should validate token freshness before executing the request
**Validates: Requirements 4.4**

Property 12: Server-based expiry handling
*For any* token that the client believes is valid, if the server returns 401, the system should trust the server response and refresh the token regardless of client-side expiry calculation
**Validates: Requirements 4.5**

Property 13: Comprehensive operation logging
*For any* token operation (refresh success, refresh failure, token clear, redirect), the system should create a log entry with timestamp, operation type, and relevant context
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 14: Debug mode verbosity
*For any* token operation when debug mode is enabled, the system should log additional details including token expiry times, retry attempts, and queue lengths
**Validates: Requirements 5.5**

## Error Handling

### Error Categories

1. **Token Expired (401)**
   - Trigger: Access token expired
   - Action: Automatic refresh and retry
   - User Impact: None (transparent)

2. **Refresh Token Invalid (401 from /refresh)**
   - Trigger: Refresh token expired or invalid
   - Action: Clear tokens, redirect to login
   - User Impact: Must login again

3. **Network Error During Refresh**
   - Trigger: Network failure, timeout
   - Action: Retry with exponential backoff (max 2 retries)
   - User Impact: Brief delay, then login if all fail

4. **User Banned/Deactivated (403)**
   - Trigger: Account status changed
   - Action: Clear tokens, show error message
   - User Impact: Cannot access application

5. **Concurrent Refresh Requests**
   - Trigger: Multiple 401s at same time
   - Action: Queue requests, single refresh
   - User Impact: None (transparent)

### Error Recovery Flow

```
API Request → 401 Error
    ↓
Check if refresh in progress?
    ↓ No
Start refresh (set flag)
    ↓
Try refresh endpoint
    ↓
Success? ─────────────→ Yes → Update tokens
    ↓ No                        ↓
Network error?                  Retry queued requests
    ↓ Yes                       ↓
Retry < 2? ──→ Yes ──→ Backoff & retry    Clear refresh flag
    ↓ No                        ↓
401 from refresh?               Success
    ↓ Yes
Clear tokens
    ↓
Redirect to login
```

### Logging Strategy

**Production Logs** (always enabled):
- Token refresh failures
- Redirects to login
- Token clear operations

**Debug Logs** (development only):
- Token refresh success
- Proactive refresh scheduling
- Request queue operations
- Token expiry calculations

## Testing Strategy

### Unit Tests

**Token Manager Tests**:
- `needsRefresh()` correctly identifies tokens expiring in < 2 minutes
- `getTokenExpiry()` parses JWT and returns correct expiry
- `scheduleRefresh()` sets timer for correct time
- `clearTokens()` removes all localStorage items
- `isRefreshing()` correctly tracks refresh state

**API Client Tests**:
- Request interceptor adds Authorization header
- Response interceptor detects 401 errors
- Request queuing during refresh
- Queue processing after successful refresh
- Queue clearing after failed refresh

**Cross-Tab Sync Tests**:
- Storage event listener updates local token
- Storage event for token clear triggers logout
- Multiple tabs stay synchronized

### Property-Based Tests

We will use **fast-check** (JavaScript property-based testing library) for property tests.

Each property test should:
- Run minimum 100 iterations
- Generate random but valid test data
- Verify the property holds for all inputs
- Tag with the property number from design doc

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

test('Property 3: Single refresh for concurrent requests', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 2, max: 10 }), // number of concurrent requests
      async (requestCount) => {
        // Setup: expired token
        // Execute: make N concurrent requests
        // Verify: exactly 1 refresh call made
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

- Full authentication flow with token refresh
- Multiple API calls with token expiry
- Cross-tab synchronization with real localStorage
- Network failure scenarios with retry logic

### Manual Testing Scenarios

1. **Token Expiry During Use**
   - Login and wait 15 minutes
   - Make API request
   - Verify automatic refresh and success

2. **Multiple Tabs**
   - Open 3 tabs
   - Logout from one tab
   - Verify all tabs redirect to login

3. **Network Interruption**
   - Disconnect network during refresh
   - Verify retry attempts
   - Reconnect and verify success

4. **Rapid Navigation**
   - Navigate quickly between pages
   - Verify no duplicate refresh calls
   - Verify all requests succeed

## Implementation Notes

### Token Expiry Calculation

When receiving a new access token, calculate and store expiry:

```typescript
function storeTokenWithExpiry(accessToken: string) {
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  const expiryDate = new Date(payload.exp * 1000);
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('tokenExpiry', expiryDate.toISOString());
}
```

### Proactive Refresh Timing

Schedule refresh for 2 minutes before expiry:

```typescript
function scheduleProactiveRefresh() {
  const expiry = getTokenExpiry();
  if (!expiry) return;
  
  const now = new Date();
  const timeUntilRefresh = expiry.getTime() - now.getTime() - (2 * 60 * 1000);
  
  if (timeUntilRefresh > 0) {
    setTimeout(() => refreshToken(), timeUntilRefresh);
  } else {
    // Token expires in < 2 minutes, refresh now
    refreshToken();
  }
}
```

### Request Queue Implementation

```typescript
let isRefreshing = false;
let requestQueue: QueuedRequest[] = [];

function queueRequest(config: AxiosRequestConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ config, resolve, reject });
  });
}

function processQueue(error: Error | null, token: string | null) {
  requestQueue.forEach(request => {
    if (error) {
      request.reject(error);
    } else {
      request.config.headers.Authorization = `Bearer ${token}`;
      request.resolve(axios(request.config));
    }
  });
  requestQueue = [];
}
```

### Exponential Backoff

```typescript
async function refreshWithRetry(attempt = 0): Promise<boolean> {
  try {
    return await refreshToken();
  } catch (error) {
    if (isNetworkError(error) && attempt < 2) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
      await sleep(delay);
      return refreshWithRetry(attempt + 1);
    }
    throw error;
  }
}
```

## Security Considerations

1. **Token Storage**: Tokens stored in localStorage (acceptable for this use case, but consider httpOnly cookies for enhanced security in future)
2. **Refresh Token Rotation**: Consider implementing refresh token rotation for enhanced security
3. **Token Invalidation**: Server-side token invalidation already implemented via database
4. **HTTPS Only**: Ensure all token transmission occurs over HTTPS in production
5. **XSS Protection**: Sanitize all user inputs to prevent token theft via XSS

## Performance Considerations

1. **Proactive Refresh**: Reduces user-facing latency by refreshing before expiry
2. **Request Queuing**: Prevents thundering herd of refresh requests
3. **Background Tab Optimization**: Avoids unnecessary refreshes in inactive tabs
4. **Minimal Storage Operations**: Batch localStorage updates where possible

## Migration Strategy

1. **Phase 1**: Deploy enhanced API client with improved interceptors
2. **Phase 2**: Add Token Manager and proactive refresh
3. **Phase 3**: Implement cross-tab synchronization
4. **Phase 4**: Add comprehensive logging and monitoring

Existing code remains functional during migration. No breaking changes to API contracts.
