import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Create Supabase client with authentication enabled
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { 
          persistSession: true,     // Enable session persistence
          autoRefreshToken: true,   // Auto-refresh tokens
          detectSessionInUrl: true  // Detect session from URL
        }
      }
    )
  : createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: { 
          persistSession: true
        }
      }
    ) as any

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Set authenticated session in Supabase client (call after login/signup)
export const setSupabaseSession = async (accessToken: string, refreshToken: string) => {
  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    if (error) {
      console.error('Error setting Supabase session:', error)
      throw error
    }

    console.log('✅ Supabase session set successfully')
  } catch (error) {
    console.error('Failed to set Supabase session:', error)
    throw error
  }
}

// Listen for auth state changes and handle token refresh
supabase.auth.onAuthStateChange((event: string, session: any) => {
  console.log('Auth state changed:', event, session)

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
      console.log('✅ Token refreshed successfully')
    }
  }

  if (event === 'SIGNED_IN') {
    console.log('✅ User signed in')
  }
})

// Clear authenticated session (call on logout)
export const clearSupabaseSession = async () => {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error clearing Supabase session:', error)
  }
}
