'use client'

/**
 * OAuth Callback Page
 *
 * This page handles the OAuth redirect from Google.
 * It extracts the authorization code and sends it to the backend,
 * then closes the popup and notifies the parent window.
 */

import { useEffect, useState } from 'react'
import { handleOAuthCallback } from '@/lib/google-oauth'

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing OAuth callback...')

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Extract authorization code from URL
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const error = params.get('error')

        // Handle errors from OAuth provider
        if (error) {
          throw new Error(error === 'access_denied' ? 'Access denied by user' : error)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        // Exchange code for tokens
        setMessage('Exchanging authorization code...')
        const result = await handleOAuthCallback(code)

        if (!result.success) {
          throw new Error(result.error || 'Failed to complete OAuth')
        }

        // Success
        setStatus('success')
        setMessage('OAuth completed successfully! Closing window...')

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage(
            { type: 'OAUTH_SUCCESS', timestamp: Date.now() },
            window.location.origin
          )
        }

        // Close popup after short delay
        setTimeout(() => {
          window.close()
        }, 1000)
      } catch (error) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setMessage(`OAuth failed: ${errorMessage}`)

        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage(
            { type: 'OAUTH_ERROR', error: errorMessage },
            window.location.origin
          )
        }

        // Close popup after delay on error too
        setTimeout(() => {
          window.close()
        }, 3000)
      }
    }

    processOAuthCallback()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {status === 'processing' && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-lg font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-green-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-600">{message}</p>
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
