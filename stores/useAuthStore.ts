// frontend/stores/useAuthStore.ts
import { create } from 'zustand'
import type { User, AuthState } from '@/types/auth'
import { setSupabaseSession, clearSupabaseSession } from '@/lib/supabase/client'

interface AuthStore extends AuthState {
  // Actions
  initializeAuth: () => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User, token: string) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,

  // Initialize auth from localStorage on app load
  initializeAuth: () => {
    const token = localStorage.getItem('printer_auth_token')
    const refreshToken = localStorage.getItem('printer_refresh_token')
    const userJson = localStorage.getItem('printer_auth_user')

    if (token && refreshToken && userJson) {
      try {
        const user = JSON.parse(userJson)
        
        // Restore Supabase session with both tokens
        setSupabaseSession(token, refreshToken).catch((error) => {
          console.error('Failed to restore Supabase session:', error)
          // Clear invalid session
          localStorage.removeItem('printer_auth_token')
          localStorage.removeItem('printer_refresh_token')
          localStorage.removeItem('printer_auth_user')
        })
        
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
  },

  // Login action
  login: async (email: string, password: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()

    // Store in localStorage (both tokens)
    localStorage.setItem('printer_auth_token', data.access_token)
    localStorage.setItem('printer_refresh_token', data.refresh_token)
    localStorage.setItem('printer_auth_user', JSON.stringify(data.user))

    // Set Supabase session with BOTH tokens
    await setSupabaseSession(data.access_token, data.refresh_token)

    set({
      token: data.access_token,
      user: data.user,
      isAuthenticated: true
    })
  },

  // Signup action
  signup: async (email: string, password: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Signup failed')
    }

    const data = await response.json()

    // Store in localStorage (both tokens)
    localStorage.setItem('printer_auth_token', data.access_token)
    localStorage.setItem('printer_refresh_token', data.refresh_token)
    localStorage.setItem('printer_auth_user', JSON.stringify(data.user))

    // Set Supabase session with BOTH tokens
    await setSupabaseSession(data.access_token, data.refresh_token)

    set({
      token: data.access_token,
      user: data.user,
      isAuthenticated: true
    })
  },

  // Logout action
  logout: () => {
    localStorage.removeItem('printer_auth_token')
    localStorage.removeItem('printer_refresh_token')
    localStorage.removeItem('printer_auth_user')
    
    // Clear Supabase session
    clearSupabaseSession()
    
    set({
      token: null,
      user: null,
      profile: null,
      isAuthenticated: false
    })
  },

  // Manual set user (for refreshing user data)
  setUser: (user: User, token: string, refreshToken?: string) => {
    localStorage.setItem('printer_auth_token', token)
    if (refreshToken) {
      localStorage.setItem('printer_refresh_token', refreshToken)
    }
    localStorage.setItem('printer_auth_user', JSON.stringify(user))
    
    // Set Supabase session with both tokens
    const storedRefreshToken = refreshToken || localStorage.getItem('printer_refresh_token')
    if (storedRefreshToken) {
      setSupabaseSession(token, storedRefreshToken)
    }
    
    set({ user, token, isAuthenticated: true })
  }
}))
