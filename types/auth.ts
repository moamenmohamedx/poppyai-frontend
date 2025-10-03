// frontend/types/auth.ts
export interface User {
  id: string
  email: string
  created_at: string
}

export interface UserProfile {
  id: string
  name?: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  profile: UserProfile | null
  token: string | null
  isAuthenticated: boolean
}

export interface SignupData {
  email: string
  password: string
  confirmPassword: string
}

export interface LoginData {
  email: string
  password: string
}

