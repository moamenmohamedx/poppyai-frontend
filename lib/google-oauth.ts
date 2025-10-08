/**
 * Google OAuth 2.0 client library with popup flow
 *
 * Flow:
 * 1. initiateGoogleOAuth() opens popup and gets auth URL
 * 2. User authorizes in popup
 * 3. Backend handles callback and stores tokens
 * 4. Popup closes and posts message to parent
 * 5. Parent window receives success/error
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface OAuthInitiateResponse {
  auth_url: string
}

export interface OAuthCallbackRequest {
  code: string
  redirect_uri: string
}

export interface OAuthTokenResponse {
  success: boolean
  token_expiry?: string
  error?: string
}

export interface OAuthStatusResponse {
  is_authenticated: boolean
  expiry?: string
}

export interface GoogleDocument {
  id: string
  name: string
  mimeType: string
  type: 'docs' | 'sheets'
  modifiedTime: string
  iconUrl?: string
}

/**
 * Get user's JWT token from localStorage or session
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  // Use the same key as useAuthStore: 'printer_auth_token'
  return localStorage.getItem('printer_auth_token') || localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}

/**
 * Initiate OAuth flow with popup window
 *
 * @returns Promise that resolves when OAuth is complete
 */
export async function initiateGoogleOAuth(): Promise<void> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated. Please log in first.')
  }

  // Step 1: Get authorization URL from backend
  const redirectUri = `${window.location.origin}/oauth/callback`

  const response = await fetch(`${API_BASE_URL}/api/oauth/google/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ redirect_uri: redirectUri }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to initiate OAuth')
  }

  const data: OAuthInitiateResponse = await response.json()

  // Step 2: Open popup window
  const popup = window.open(
    data.auth_url,
    'Google OAuth',
    'width=600,height=700,left=200,top=100'
  )

  if (!popup) {
    throw new Error('Popup blocked. Please allow popups for this site.')
  }

  // Step 3: Wait for popup to complete OAuth flow
  return new Promise<void>((resolve, reject) => {
    // Listen for message from popup
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return

      // Handle OAuth result
      if (event.data.type === 'OAUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        resolve()
      } else if (event.data.type === 'OAUTH_ERROR') {
        window.removeEventListener('message', handleMessage)
        popup.close()
        reject(new Error(event.data.error || 'OAuth failed'))
      }
    }

    window.addEventListener('message', handleMessage)

    // Handle popup closed without completing
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        reject(new Error('OAuth cancelled'))
      }
    }, 1000)
  })
}

/**
 * Check if user has valid Google OAuth credentials
 */
export async function checkGoogleAuth(): Promise<OAuthStatusResponse> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated. Please log in first.')
  }

  const response = await fetch(`${API_BASE_URL}/api/oauth/google/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to check OAuth status')
  }

  return await response.json()
}

/**
 * Fetch user's Google Docs and Sheets
 * Requires OAuth authentication
 */
export async function fetchUserDocuments(): Promise<GoogleDocument[]> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated. Please log in first.')
  }

  const response = await fetch(`${API_BASE_URL}/api/google/documents`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NOT_AUTHENTICATED_WITH_GOOGLE')
    }
    const error = await response.json()
    throw new Error(error.detail || 'Failed to fetch documents')
  }

  const data = await response.json()
  return data.documents || []
}

/**
 * Fetch document content by file ID
 * Requires OAuth authentication
 */
export async function fetchDocumentContentById(
  documentId: string,
  type: 'docs' | 'sheets'
): Promise<{ content: string; sheet_names: string[] | null }> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated. Please log in first.')
  }

  const response = await fetch(`${API_BASE_URL}/api/google/content-by-id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ document_id: documentId, type }),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NOT_AUTHENTICATED_WITH_GOOGLE')
    }
    const error = await response.json()
    throw new Error(error.detail || 'Failed to fetch content')
  }

  return await response.json()
}

/**
 * Handle OAuth callback (called from /oauth/callback page)
 * Exchanges authorization code for tokens
 */
export async function handleOAuthCallback(code: string): Promise<OAuthTokenResponse> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Not authenticated. Please log in first.')
  }

  const redirectUri = `${window.location.origin}/oauth/callback`

  const response = await fetch(`${API_BASE_URL}/api/oauth/google/callback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to complete OAuth')
  }

  return await response.json()
}
