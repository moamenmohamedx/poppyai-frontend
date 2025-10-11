# Frontend Quick Reference Guide

A condensed cheat sheet of key concepts from all chapters.

---

## TypeScript Essentials

```typescript
// Interfaces
interface User {
  id: string
  email: string
}

// Type Aliases
type UUID = string

// Generics
Node<ChatNodeData>

// Utility Types
Omit<Type, 'property'>
Partial<Type>
Pick<Type, 'property'>

// Union Types
type Role = 'user' | 'assistant'

// Optional Chaining
node?.data?.projectId

// Nullish Coalescing
const value = config ?? 'default'
```

---

## React Hooks

```typescript
// State
const [state, setState] = useState(initialValue)
setState(newValue)
setState(prev => prev + 1)  // Functional update

// Effect
useEffect(() => {
  // Side effect
  return () => {
    // Cleanup
  }
}, [dependencies])

// Callback (memoize function)
const memoizedFn = useCallback(() => {}, [deps])

// Memo (memoize value)
const memoizedValue = useMemo(() => expensiveCalc(), [deps])

// Ref (no re-render)
const ref = useRef(initialValue)
ref.current = newValue  // Doesn't trigger re-render
```

---

## Zustand

```typescript
// Create store
const useStore = create<StoreType>((set, get) => ({
  // State
  count: 0,
  
  // Actions
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}))

// Use in component (selective)
const count = useStore(state => state.count)

// Use in component (all)
const { count, increment } = useStore()

// Outside component
useStore.getState().increment()
```

---

## Next.js App Router

```typescript
// File structure
app/
  layout.tsx    // Root layout
  page.tsx      // Home page (/)
  auth/
    login/
      page.tsx  // /auth/login

// Client component
"use client"
import { useState } from "react"

// Server component (default)
export default async function Page() {
  const data = await fetchData()  // Can use await
  return <div>{data}</div>
}

// Navigation
const router = useRouter()
router.push('/path')

// Link
<Link href="/path">Go</Link>
```

---

## React Flow

```typescript
// Node structure
{
  id: 'node-1',
  type: 'chatNode',
  position: { x: 100, y: 200 },
  data: { projectId: '123' }
}

// Edge structure
{
  id: 'edge-1-2',
  source: 'node-1',
  target: 'node-2',
  type: 'smoothstep',
  animated: true
}

// Custom node
function ChatNode({ id, data, selected }: NodeProps) {
  return (
    <div>
      <Handle type="target" position={Position.Left} />
      {/* Node UI */}
    </div>
  )
}

// Register nodes
const nodeTypes = { chatNode: ChatNode }
<ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} />
```

---

## Tailwind CSS

```typescript
// Common classes
className="
  flex items-center justify-between  // Flexbox
  p-4 px-6 py-2                      // Padding
  m-4 mt-2 mb-4                      // Margin
  text-sm font-bold                  // Typography
  bg-white text-gray-900             // Colors
  border rounded-lg                  // Border
  shadow-md                          // Shadow
  hover:bg-gray-100                  // Hover
  dark:bg-black dark:text-white      // Dark mode
  transition-all duration-200        // Animation
"

// cn() utility
import { cn } from '@/lib/utils'
className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "disabled-classes"
)}
```

---

## shadcn/ui Components

```typescript
// Button
import { Button } from '@/components/ui/button'
<Button variant="default" size="lg">Click</Button>

// Dialog
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Content</DialogContent>
</Dialog>

// Card
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

---

## React Query

```typescript
// Query (fetch data)
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => getMessages(conversationId),
  staleTime: 30 * 1000,
  enabled: !!conversationId
})

// Mutation (create/update/delete)
const mutation = useMutation({
  mutationFn: createConversation,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }
})

// Optimistic update
queryClient.setQueryData(['messages'], (old) => [...old, newMessage])

// Invalidate (refetch)
queryClient.invalidateQueries({ queryKey: ['messages'] })

// Remove from cache
queryClient.removeQueries({ queryKey: ['messages'] })
```

---

## Server-Sent Events (SSE)

```typescript
// Start stream
const cleanup = streamChat(request, {
  onToken: (data) => setStreamedText(prev => prev + data.token),
  onStreamEnd: (data) => refetchMessages(data.message_id),
  onError: (error) => toast.error(error.error)
})

// Cancel stream
cleanup()

// Hook wrapper
const { isStreaming, streamedText, startStreaming, cancelStreaming } = useStreamingChat({
  onComplete: async (text, convId, msgId) => {
    await queryClient.refetchQueries({ queryKey: ['messages', convId] })
  }
})
```

---

## Authentication

```typescript
// Auth store
const { user, token, isAuthenticated, login, logout } = useAuthStore()

// Login
await login(email, password)
// Stores token in localStorage and Zustand

// Protected route
useEffect(() => {
  if (!isAuthenticated) {
    router.push('/auth/login')
  }
}, [isAuthenticated])

// API request with auth
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## API Integration

```typescript
// API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export const getMessages = async (conversationId: UUID): Promise<Message[]> => {
  const token = localStorage.getItem('printer_auth_token')
  
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }
  
  return response.json()
}
```

---

## Common Patterns

### Data Flow Pattern

```
User Input → React State → Zustand Store → API Call → Backend
Backend → API Response → React Query Cache → React State → UI
```

### Optimistic Update Pattern

```typescript
// 1. Update UI immediately
queryClient.setQueryData(['messages'], (old) => [...old, optimisticMessage])

// 2. Send request
await sendMessage()

// 3. On success, refetch real data
queryClient.refetchQueries({ queryKey: ['messages'] })
```

### Store Coordination Pattern

```typescript
// Multiple stores working together
const contextNodeIds = useReactFlowStore(state => 
  state.edges
    .filter(edge => edge.target === chatNodeId)
    .map(edge => edge.source)
)

const activeConversationId = useConversationStore(state => 
  state.getActiveConversation(chatNodeId)
)

const projectId = useProjectStore(state => state.currentProject?.id)
```

---

## Common Issues & Solutions

### Issue: Component re-renders too much
```typescript
// Solution: Use selective Zustand selectors
const count = useStore(state => state.count)  // Only re-renders when count changes
```

### Issue: Stale closure in useEffect
```typescript
// Solution: Include all dependencies or use ref
useEffect(() => {
  doSomething(value)  // Make sure 'value' is in dependencies
}, [value])
```

### Issue: Race condition in async operations
```typescript
// Solution: Use React Query or cleanup flags
useEffect(() => {
  let cancelled = false
  
  fetchData().then(data => {
    if (!cancelled) setData(data)
  })
  
  return () => { cancelled = true }
}, [])
```

### Issue: Infinite loop in useEffect
```typescript
// Problem: Object/array in dependencies
useEffect(() => {
  doSomething(config)
}, [config])  // config is new object every render

// Solution: Depend on primitive values
useEffect(() => {
  doSomething(config)
}, [config.id, config.name])
```

---

## File Structure

```
frontend/
  app/              # Next.js pages and layouts
  components/       # React components
    ui/             # shadcn/ui components
    nodes/          # React Flow nodes
  lib/              # Utilities
    api/            # API clients
  stores/           # Zustand stores
  hooks/            # Custom hooks
  types/            # TypeScript types
```

---

## Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...
```

---

## Debugging Tips

### React DevTools
- Component tree
- Props and state inspection
- Profiler for performance

### React Query DevTools
- View all queries
- Inspect cache
- Trigger refetches

### Console Logs
```typescript
console.log('[Component] State:', state)  // Tag logs by component
```

### Network Tab
- Inspect API requests
- Check response status
- View request/response bodies

---

## Performance Checklist

- [ ] Memoize expensive components with `memo()`
- [ ] Use `useCallback` for functions passed as props
- [ ] Use `useMemo` for expensive computations
- [ ] Use Zustand selectors (don't grab entire state)
- [ ] Set appropriate `staleTime` in React Query
- [ ] Lazy load large components
- [ ] Optimize images (Next.js Image component)
- [ ] Code split with dynamic imports

---

## Security Checklist

- [ ] Store tokens in localStorage (acceptable for JWTs)
- [ ] Use HTTPS in production
- [ ] Short access token expiration
- [ ] Validate user input
- [ ] Handle 401 errors (logout user)
- [ ] Don't expose secrets in frontend
- [ ] Use environment variables
- [ ] Clear tokens on logout

---

This quick reference covers the essential concepts from all 10 chapters. Refer to the full chapter notes for detailed explanations and more examples!

