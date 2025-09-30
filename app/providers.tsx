'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside the component to avoid serialization issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Conversation data should be fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests twice
        retry: 2,
        // Don't refetch on window focus for chat data (user initiated)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  }))

  // Expose queryClient globally for cache cleanup operations
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).queryClient = queryClient
      console.log('✅ QueryClient exposed globally for cache management')
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).queryClient
      }
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
