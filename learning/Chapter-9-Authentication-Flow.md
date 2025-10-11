# Chapter 9: Authentication & Authorization Flow

## Overview

Printer AI uses JWT (JSON Web Token) authentication with Supabase as the identity provider. This chapter covers the complete authentication flow, token management, session persistence, and protected routes.

---

## 1. Authentication Architecture

### Components

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │────────►│ FastAPI      │────────►│  Supabase    │
│   (React)   │◄────────│  Backend     │◄────────│  (Postgres)  │
└─────────────┘         └──────────────┘         └──────────────┘
    │                         │
    │                         │
    ▼                         ▼
 localStorage            JWT Verification
 Zustand Store           User Database
```

### Flow Overview

1. User submits credentials to backend
2. Backend validates with Supabase
3. Backend returns JWT tokens (access + refresh)
4. Frontend stores tokens in localStorage + Zustand
5. Frontend includes access token in all API requests
6. Backend verifies token on each request

---

## 2. JWT Tokens

### What is a JWT?

JSON Web Token - a compact, URL-safe means of representing claims:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Structure:**
- Header: Algorithm and token type
- Payload: User data and claims (sub, exp, iat)
- Signature: Verifies token hasn't been tampered with

### Access Token vs Refresh Token

```typescript
{
  access_token: "eyJhbGci...",   // Short-lived (15 min - 1 hour)
  refresh_token: "eyJhbGci...",  // Long-lived (7-30 days)
}
```

**Access Token:**
- Used for API requests
- Short expiration (security)
- Included in Authorization header

**Refresh Token:**
- Used to get new access tokens
- Long expiration (convenience)
- Stored securely, rarely sent

---

## 3. Auth Store

### State Structure

```typescript
// From frontend/stores/useAuthStore.ts
interface AuthStore {
  // State
  user: User | null
  profile: Profile | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  initializeAuth: () => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User, token: string) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  
  // ... actions
}))
```

---

## 4. Login Flow

### Complete Login Implementation

```typescript
// From frontend/stores/useAuthStore.ts
login: async (email: string, password: string) => {
  // 1. Call backend login endpoint
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  // 2. Handle errors
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  // 3. Parse response
  const data = await response.json()
  // data = { access_token, refresh_token, user: { id, email, created_at } }

  // 4. Store tokens in localStorage (persistence)
  localStorage.setItem('printer_auth_token', data.access_token)
  localStorage.setItem('printer_refresh_token', data.refresh_token)
  localStorage.setItem('printer_auth_user', JSON.stringify(data.user))

  // 5. Set Supabase session (for direct Supabase calls)
  await setSupabaseSession(data.access_token, data.refresh_token)

  // 6. Update Zustand state (reactive)
  set({
    token: data.access_token,
    user: data.user,
    isAuthenticated: true
  })
}
```

### Login Component

```typescript
// From frontend/components/auth/LoginForm.tsx
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      await login(email, password)
      toast.success('Login successful!')
      router.push('/')  // Navigate to home
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}
```

---

## 5. Signup Flow

### Implementation

```typescript
// From frontend/stores/useAuthStore.ts
signup: async (email: string, password: string) => {
  const response = await fetch(`${apiUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Signup failed')
  }

  const data = await response.json()

  // Same storage as login
  localStorage.setItem('printer_auth_token', data.access_token)
  localStorage.setItem('printer_refresh_token', data.refresh_token)
  localStorage.setItem('printer_auth_user', JSON.stringify(data.user))

  await setSupabaseSession(data.access_token, data.refresh_token)

  set({
    token: data.access_token,
    user: data.user,
    isAuthenticated: true
  })
}
```

---

## 6. Session Persistence

### Initialize Auth on App Load

```typescript
// From frontend/stores/useAuthStore.ts
initializeAuth: () => {
  // 1. Read from localStorage
  const token = localStorage.getItem('printer_auth_token')
  const refreshToken = localStorage.getItem('printer_refresh_token')
  const userJson = localStorage.getItem('printer_auth_user')

  // 2. Validate data exists
  if (token && refreshToken && userJson) {
    try {
      const user = JSON.parse(userJson)
      
      // 3. Restore Supabase session
      setSupabaseSession(token, refreshToken).catch((error) => {
        console.error('Failed to restore Supabase session:', error)
        // Clear invalid session
        localStorage.removeItem('printer_auth_token')
        localStorage.removeItem('printer_refresh_token')
        localStorage.removeItem('printer_auth_user')
      })
      
      // 4. Update Zustand state
      set({
        token,
        user,
        isAuthenticated: true
      })
    } catch (e) {
      // Invalid stored data, clear it
      localStorage.removeItem('printer_auth_token')
      localStorage.removeItem('printer_refresh_token')
      localStorage.removeItem('printer_auth_user')
    }
  }
}
```

### Call on App Mount

```typescript
// From frontend/app/providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  
  useEffect(() => {
    initializeAuth()  // Restore session on app load
  }, [initializeAuth])
  
  return <>{children}</>
}
```

---

## 7. Logout Flow

### Clear Everything

```typescript
// From frontend/stores/useAuthStore.ts
logout: () => {
  // 1. Clear localStorage
  localStorage.removeItem('printer_auth_token')
  localStorage.removeItem('printer_refresh_token')
  localStorage.removeItem('printer_auth_user')
  
  // 2. Clear Supabase session
  clearSupabaseSession()
  
  // 3. Reset Zustand state
  set({
    token: null,
    user: null,
    profile: null,
    isAuthenticated: false
  })
}
```

### Usage

```typescript
function Header() {
  const logout = useAuthStore((state) => state.logout)
  const router = useRouter()
  
  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }
  
  return (
    <Button onClick={handleLogout}>
      Logout
    </Button>
  )
}
```

---

## 8. Protected Routes

### Route Protection Pattern

```typescript
// From frontend/app/page.tsx
'use client'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  // Don't render until auth check completes
  if (!isAuthenticated) {
    return null  // Or <LoadingSpinner />
  }

  return <Dashboard />
}
```

### Higher-Order Component Pattern

```typescript
// lib/withAuth.tsx
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()
    
    useEffect(() => {
      if (!isAuthenticated) {
        router.push('/auth/login')
      }
    }, [isAuthenticated, router])
    
    if (!isAuthenticated) {
      return <LoadingSpinner />
    }
    
    return <Component {...props} />
  }
}

// Usage
export default withAuth(Dashboard)
```

---

## 9. API Request Authentication

### Adding Auth Header

```typescript
// From frontend/lib/api/conversations.ts
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('printer_auth_token')
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// Use in requests
export const getMessages = async (conversationId: UUID): Promise<Message[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
    { headers: getAuthHeaders() }
  )
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      // Could trigger logout or token refresh here
      throw new Error('Authentication required')
    }
    throw new Error('Failed to fetch messages')
  }
  
  return response.json()
}
```

---

## 10. Supabase Integration

### Supabase Client Setup

```typescript
// From frontend/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { 
      persistSession: true,      // Persist session in localStorage
      autoRefreshToken: true,    // Auto-refresh expired tokens
      detectSessionInUrl: true   // Handle OAuth callbacks
    }
  }
)

// Set session after login
export const setSupabaseSession = async (accessToken: string, refreshToken: string) => {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })
  
  if (error) {
    console.error('Error setting Supabase session:', error)
    throw error
  }
}

// Clear session on logout
export const clearSupabaseSession = async () => {
  await supabase.auth.signOut()
}
```

### Auth State Change Listener

```typescript
// From frontend/lib/supabase/client.ts
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event)

  if (event === 'SIGNED_OUT') {
    // Clear local storage
    localStorage.removeItem('printer_auth_token')
    localStorage.removeItem('printer_refresh_token')
    localStorage.removeItem('printer_auth_user')

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }

  if (event === 'TOKEN_REFRESHED') {
    // Update stored tokens
    if (session) {
      localStorage.setItem('printer_auth_token', session.access_token)
      localStorage.setItem('printer_refresh_token', session.refresh_token)
    }
  }
})
```

---

## 11. Token Refresh

### Automatic Refresh with Supabase

Supabase handles token refresh automatically when `autoRefreshToken: true`:

```typescript
// Supabase automatically:
// 1. Detects when access token is about to expire
// 2. Uses refresh token to get new access token
// 3. Fires TOKEN_REFRESHED event
// 4. Updates session in localStorage
```

### Manual Refresh (if needed)

```typescript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('printer_refresh_token')
  
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  
  const response = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  })
  
  if (!response.ok) {
    // Refresh failed, need to re-login
    useAuthStore.getState().logout()
    throw new Error('Token refresh failed')
  }
  
  const { access_token } = await response.json()
  
  // Update stored token
  localStorage.setItem('printer_auth_token', access_token)
  useAuthStore.getState().setUser(user, access_token)
}
```

---

## 12. Backend Token Verification

### How Backend Verifies Tokens

```python
# Backend: backend/canvas_agent/auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import jwt

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    try:
        # Decode JWT token
        payload = jwt.decode(
            token.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        
        # Extract user ID
        user_id = payload.get("sub")
        
        # Fetch user from database
        user = await get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Protected Endpoint

```python
@router.get("/api/conversations")
async def get_conversations(
    current_user: User = Depends(get_current_user)
):
    # current_user is automatically injected
    conversations = await get_user_conversations(current_user.id)
    return conversations
```

---

## 13. Security Best Practices

### Do's

✅ **Store tokens in localStorage** (acceptable for access tokens)
✅ **Use HTTPS** in production
✅ **Short access token expiration** (15-60 minutes)
✅ **Long refresh token expiration** (7-30 days)
✅ **Validate tokens on every request**
✅ **Clear tokens on logout**
✅ **Handle token expiration gracefully**

### Don'ts

❌ **Don't store tokens in cookies** (CSRF vulnerable without proper setup)
❌ **Don't put sensitive data in JWT payload** (it's base64, not encrypted)
❌ **Don't skip HTTPS in production**
❌ **Don't use long-lived access tokens**
❌ **Don't forget to clear tokens on logout**

---

## 14. Error Handling

### 401 Unauthorized

```typescript
const handleApiError = async (response: Response) => {
  if (response.status === 401) {
    // Token expired or invalid
    toast.error('Session expired. Please log in again.')
    useAuthStore.getState().logout()
    window.location.href = '/auth/login'
    return
  }
  
  const error = await response.json()
  throw new Error(error.detail || 'Request failed')
}

// Use in API calls
export const getMessages = async (conversationId: UUID) => {
  const response = await fetch(url, { headers: getAuthHeaders() })
  
  if (!response.ok) {
    await handleApiError(response)
  }
  
  return response.json()
}
```

---

## 15. Complete Auth Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      APP INITIALIZATION                      │
├─────────────────────────────────────────────────────────────┤
│ 1. App loads                                                 │
│ 2. initializeAuth() called                                   │
│ 3. Read tokens from localStorage                             │
│ 4. If tokens exist:                                          │
│    - Restore Supabase session                                │
│    - Set Zustand state (isAuthenticated = true)             │
│    - User stays on current page                              │
│ 5. If no tokens:                                             │
│    - isAuthenticated = false                                 │
│    - Redirect to /auth/login                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                           │
├─────────────────────────────────────────────────────────────┤
│ 1. User enters email + password                              │
│ 2. Frontend calls POST /api/auth/login                       │
│ 3. Backend validates with Supabase                           │
│ 4. Backend returns { access_token, refresh_token, user }     │
│ 5. Frontend stores in localStorage + Zustand                 │
│ 6. Frontend sets Supabase session                            │
│ 7. Redirect to home page                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       API REQUESTS                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Get token from localStorage                               │
│ 2. Add Authorization: Bearer <token> header                  │
│ 3. Send request                                              │
│ 4. Backend verifies token                                    │
│ 5. Backend returns data or 401 if invalid                    │
│ 6. Frontend handles 401 → logout → redirect to login         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         LOGOUT                               │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks logout                                        │
│ 2. Clear localStorage                                        │
│ 3. Clear Supabase session                                    │
│ 4. Reset Zustand state                                       │
│ 5. Redirect to /auth/login                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **JWT Tokens**: Access (short) + Refresh (long)
2. **localStorage**: Persist tokens across sessions
3. **Zustand**: Reactive auth state
4. **Supabase**: Identity provider and token management
5. **Protected Routes**: Redirect unauthenticated users
6. **Auth Headers**: Bearer token in Authorization header
7. **Initialize**: Restore session on app load
8. **Logout**: Clear everything (localStorage, Zustand, Supabase)
9. **Token Refresh**: Automatic with Supabase
10. **Error Handling**: 401 → logout → redirect

---

## Best Practices

1. **Always initialize auth** on app mount
2. **Store both tokens** (access + refresh)
3. **Use functional selectors** to prevent unnecessary re-renders
4. **Handle 401 globally** - logout and redirect
5. **Clear everything on logout** - no leftover state
6. **Protect all routes** that require authentication
7. **Show loading states** during auth checks
8. **Validate tokens** on every API request
9. **Use HTTPS** in production
10. **Short access tokens** for better security

---

## Next Steps

Now you understand:
- Complete authentication flow
- Token management and storage
- Protected routes pattern
- API request authentication
- Session persistence
- Supabase integration

Authentication is the gateway - it protects your application and identifies users!

