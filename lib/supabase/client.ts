import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

// Create Supabase client - type safety will be added when env vars are configured
export const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { 
          persistSession: false // No auth for single-user setup
        }
      }
    )
  : createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: { 
          persistSession: false
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
