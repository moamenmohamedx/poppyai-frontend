# Chapter 4: Next.js App Router & Project Structure

## Overview

Next.js is a React framework that provides features like file-based routing, server-side rendering, and optimized builds. Printer AI uses Next.js 15 with the App Router, representing the modern approach to building Next.js applications.

---

## 1. What is Next.js?

Next.js adds powerful features on top of React:

- **File-based Routing**: Folders and files define routes
- **Server Components**: Components that render on the server
- **Client Components**: Interactive components that run in the browser
- **Automatic Code Splitting**: Only load JavaScript needed for each page
- **Image Optimization**: Automatic image resizing and lazy loading
- **API Routes**: Backend endpoints in the same codebase

---

## 2. App Router vs Pages Router

### Pages Router (Old)

```
pages/
  index.tsx          → /
  about.tsx          → /about
  blog/
    [slug].tsx       → /blog/:slug
```

### App Router (New - What We Use)

```
app/
  page.tsx           → /
  layout.tsx         → Layout for all pages
  auth/
    login/
      page.tsx       → /auth/login
```

**Key Difference**: App Router uses `page.tsx` inside folders, allows nested layouts, and supports Server Components.

---

## 3. File-Based Routing

### Special Files in App Router

```
app/
  layout.tsx         # Root layout (wraps everything)
  page.tsx           # Home page (/)
  loading.tsx        # Loading UI
  error.tsx          # Error UI
  not-found.tsx      # 404 page
  
  auth/
    layout.tsx       # Layout for /auth/* routes
    login/
      page.tsx       # /auth/login
    signup/
      page.tsx       # /auth/signup
```

### Printer AI Route Structure

```
app/
  layout.tsx         # Root layout with providers
  page.tsx           # Main app (dashboard/canvas)
  globals.css        # Global styles
  
  auth/
    login/
      page.tsx       # Login page (/auth/login)
    signup/
      page.tsx       # Signup page (/auth/signup)
  
  oauth/
    callback/
      page.tsx       # OAuth callback (/oauth/callback)
  
  providers/
    ProjectProvider.tsx  # Context provider
  
  providers.tsx      # Theme provider
```

---

## 4. Layouts: Persistent UI

Layouts wrap pages and persist across navigation (don't re-render).

### Root Layout

```typescript
// From frontend/app/layout.tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Context Organizer',
  description: 'Organize your content and chat with context',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {children}
          <Toaster position="top-center" />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
```

### Key Features

1. **Wraps All Pages**: Every route renders inside this layout
2. **Metadata Export**: SEO information
3. **Font Variables**: CSS variables for fonts
4. **Providers**: React Query, theme, etc.
5. **Persistent Components**: Toaster, Analytics

### Layout Hierarchy

```
RootLayout (app/layout.tsx)
  └─ Providers (React Query, Theme)
      └─ HomePage (app/page.tsx)
          └─ Dashboard or Canvas

RootLayout (app/layout.tsx)
  └─ Providers
      └─ AuthLayout (app/auth/layout.tsx - if it existed)
          └─ LoginPage (app/auth/login/page.tsx)
```

Layouts nest - inner layouts wrap their section of the app.

---

## 5. Pages: Route Content

Pages define the content for a specific route.

### Home Page

```typescript
// From frontend/app/page.tsx
"use client"  // Must be client component (uses hooks)

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/Dashboard"
import Canvas from "@/components/Canvas"
import { useAuthStore } from "@/stores/useAuthStore"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [currentView, setCurrentView] = useState<"dashboard" | "canvas">("dashboard")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null  // Don't render until auth check
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {currentView === "dashboard" ? (
        <Dashboard onCreateProject={handleCreateProject} />
      ) : (
        <Canvas projectId={currentProject} />
      )}
    </main>
  )
}
```

### Pattern: Protected Routes

```typescript
// Auth check pattern
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/auth/login')
  }
}, [isAuthenticated])

// Don't render until checked
if (!isAuthenticated) {
  return null  // or <LoadingSpinner />
}
```

---

## 6. Server vs Client Components

### Server Components (Default)

By default, all components in the App Router are Server Components:

```typescript
// This runs on the server
export default function ServerComponent() {
  const data = await fetchData()  // Can use await directly!
  
  return <div>{data}</div>
}
```

**Benefits:**
- Faster initial load (HTML sent to browser)
- Can access backend directly
- No JavaScript sent to client
- Better SEO

**Limitations:**
- No hooks (useState, useEffect, etc.)
- No browser APIs
- No event handlers
- Can't use Zustand stores

### Client Components

Use `"use client"` directive for interactive components:

```typescript
// From frontend/app/page.tsx
"use client"

import { useState } from "react"

export default function ClientComponent() {
  const [count, setCount] = useState(0)  // ✅ Works now
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

**When to Use "use client":**
- Using React hooks
- Using browser APIs (localStorage, window, etc.)
- Event handlers (onClick, onChange, etc.)
- Using Zustand stores
- Third-party libraries that use hooks

### Printer AI Usage

```typescript
// Most of our components are client components
"use client"  // Top of file

// Because we use:
- useState, useEffect
- Zustand stores
- Event handlers
- Browser APIs
```

---

## 7. Navigation

### useRouter Hook

```typescript
'use client'
import { useRouter } from 'next/navigation'

function LoginPage() {
  const router = useRouter()
  
  const handleLogin = async () => {
    await loginUser()
    router.push('/')  // Navigate to home
  }
}
```

### Link Component

```typescript
import Link from 'next/link'

function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/auth/login">Login</Link>
    </nav>
  )
}
```

**Link vs router.push():**
- **Link**: Declarative, prefetches on hover
- **router.push()**: Programmatic, after actions

---

## 8. Providers Pattern

Wrap the app with context providers for global features.

### Main Providers File

```typescript
// From frontend/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,  // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))
  
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  
  useEffect(() => {
    initializeAuth()  // Restore auth from localStorage
  }, [initializeAuth])

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
```

### Pattern Breakdown

1. **QueryClientProvider**: React Query for data fetching
2. **ThemeProvider**: Dark/light mode from `next-themes`
3. **Auth Initialization**: Restore user session on mount
4. **Client Component**: Must use "use client" (uses hooks)

### Custom Provider Example

```typescript
// From frontend/app/providers/ProjectProvider.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const projectStore = useProjectStore()
  
  return (
    <ProjectContext.Provider value={projectStore}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
```

---

## 9. Metadata and SEO

### Static Metadata

```typescript
// From frontend/app/layout.tsx
export const metadata: Metadata = {
  title: 'AI Context Organizer',
  description: 'Organize your content and chat with context',
  generator: 'Next.js',
}
```

### Dynamic Metadata

```typescript
// In a page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const project = await fetchProject(params.id)
  
  return {
    title: project.name,
    description: project.description
  }
}
```

---

## 10. Environment Variables

Next.js has special environment variable handling:

### .env.local

```bash
# Public variables (exposed to browser)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Private variables (server-only)
DATABASE_URL=postgresql://...
SECRET_KEY=secret
```

### Usage

```typescript
// From frontend/lib/api/streaming.ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000'
```

**Rule**: Only variables prefixed with `NEXT_PUBLIC_` are available in client components!

---

## 11. Imports and Path Aliases

Next.js supports TypeScript path aliases:

### Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./frontend/*"]
    }
  }
}
```

### Usage

```typescript
// Instead of:
import { Button } from '../../../components/ui/button'

// Use:
import { Button } from '@/components/ui/button'
```

**Pattern in Printer AI:**
- `@/components/*` - UI components
- `@/stores/*` - Zustand stores
- `@/lib/*` - Utilities and API clients
- `@/types/*` - TypeScript types
- `@/hooks/*` - Custom hooks

---

## 12. CSS and Styling

### Global Styles

```typescript
// frontend/app/layout.tsx
import './globals.css'  // Imported in root layout
```

### Component Styles

```typescript
// frontend/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* CSS variables for theming */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

### Inline Styles with Tailwind

```typescript
<div className="min-h-screen bg-gray-50 dark:bg-black">
  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
    Click Me
  </button>
</div>
```

---

## 13. Project Structure Best Practices

### Printer AI Structure

```
frontend/
  app/                    # Next.js App Router
    layout.tsx            # Root layout
    page.tsx              # Home page
    globals.css           # Global styles
    auth/                 # Auth routes
    providers/            # Context providers
    providers.tsx         # Main providers
    
  components/             # React components
    ui/                   # shadcn/ui components
    nodes/                # React Flow nodes
    auth/                 # Auth forms
    Dashboard.tsx
    Canvas.tsx
    
  lib/                    # Utilities
    api/                  # API clients
    supabase/             # Supabase client
    utils.ts              # Helper functions
    
  stores/                 # Zustand stores
    useAuthStore.ts
    useReactFlowStore.ts
    
  hooks/                  # Custom hooks
    useStreamingChat.ts
    useAutoSaveCanvas.ts
    
  types/                  # TypeScript types
    apiTypes.ts
    reactFlowTypes.ts
    
  public/                 # Static assets
    placeholder.svg
```

### Organization Principles

1. **app/**: Routes and layouts only
2. **components/**: Reusable UI (doesn't fetch data directly)
3. **lib/**: Pure functions and API clients
4. **stores/**: Global state management
5. **hooks/**: Reusable logic with hooks
6. **types/**: Shared TypeScript types

---

## 14. Loading and Error States

### Loading UI

```typescript
// app/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
```

Automatically shown while page is loading.

### Error UI

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 15. Real-World Example: Auth Flow

Let's trace the authentication flow through the app structure:

### 1. User Lands on Home Page

```typescript
// app/page.tsx
export default function Home() {
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')  // Redirect to login
    }
  }, [isAuthenticated])
}
```

### 2. Login Page Renders

```typescript
// app/auth/login/page.tsx
export default function LoginPage() {
  return <LoginForm />
}
```

### 3. User Submits Login

```typescript
// components/auth/LoginForm.tsx
const handleSubmit = async (e) => {
  e.preventDefault()
  await login(email, password)  // Zustand action
  router.push('/')  // Navigate to home
}
```

### 4. Auth Store Updates

```typescript
// stores/useAuthStore.ts
login: async (email, password) => {
  const data = await fetch('/api/auth/login', { ... })
  
  // Update localStorage and state
  localStorage.setItem('printer_auth_token', data.access_token)
  set({ user: data.user, isAuthenticated: true })
}
```

### 5. Home Page Renders

```typescript
// app/page.tsx - isAuthenticated is now true
if (!isAuthenticated) {
  return null  // Skip
}

return <Dashboard />  // Renders!
```

---

## Key Takeaways

1. **File-Based Routing**: Folders = routes, `page.tsx` = content
2. **Layouts**: Persistent UI that wraps pages
3. **Server Components**: Default, fast, no JavaScript
4. **Client Components**: "use client", interactive, uses hooks
5. **Providers**: Wrap app with global context (React Query, theme)
6. **Navigation**: `router.push()` or `<Link>`
7. **Environment Variables**: `NEXT_PUBLIC_` prefix for client-side
8. **Path Aliases**: `@/` instead of relative imports
9. **Metadata**: SEO in layout or page files
10. **Structure**: Separate routes, components, utilities, stores

---

## Next Steps

Now that you understand Next.js App Router:
- See how React Flow canvas integrates as a client component
- Learn how UI components are built with Tailwind and Radix
- Understand how API calls flow from pages → hooks → API clients
- Master the complete request lifecycle from route to render

Next.js provides the structure - everything else plugs into it!

