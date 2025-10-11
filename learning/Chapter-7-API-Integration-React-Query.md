# Chapter 7: API Integration & React Query

## Overview

TanStack React Query (formerly React Query) is a powerful data-fetching library that handles caching, background updates, and stale data management. Printer AI uses React Query to manage all API calls with automatic caching and optimistic updates.

---

## 1. Why React Query?

### Problems with Manual Fetching

```typescript
// ❌ Manual approach - lots of boilerplate
function ChatNode() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        setMessages(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err)
        setIsLoading(false)
      })
  }, [])
  
  // Manual refresh
  const refetch = () => { /* repeat all above */ }
}
```

### React Query Solution

```typescript
// ✅ React Query - clean and powerful
function ChatNode() {
  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getMessages(conversationId)
  })
  
  // Automatic caching, deduplication, refetching!
}
```

---

## 2. Query Client Setup

### Provider Configuration

```typescript
// From frontend/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,           // Data fresh for 1 minute
        refetchOnWindowFocus: false,     // Don't refetch on window focus
        retry: 1,                        // Retry failed queries once
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Global Access

```typescript
// Make queryClient available globally for non-React code
import { useQueryClient } from '@tanstack/react-query'

function App() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    (window as any).queryClient = queryClient
  }, [queryClient])
}
```

---

## 3. useQuery: Fetching Data

### Basic Usage

```typescript
import { useQuery } from '@tanstack/react-query'

const { data, isLoading, error, refetch, isRefetching } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => getMessages(conversationId),
  staleTime: 30 * 1000,  // Override default
  enabled: !!conversationId  // Only run if conversationId exists
})
```

### Query Keys: Hierarchical Caching

Query keys uniquely identify queries and form a cache hierarchy:

```typescript
// From frontend/components/nodes/ChatNode.tsx

// Conversations for a specific chat node
const { data: conversations } = useQuery({
  queryKey: ['conversations', chatNodeId],
  queryFn: () => getConversationsForNode(chatNodeId)
})

// Messages for a specific conversation
const { data: messages } = useQuery({
  queryKey: ['messages', activeConversationId],
  queryFn: () => getMessages(activeConversationId)
})

// Hierarchy:
// ['conversations', 'chat-node-1']
// ['conversations', 'chat-node-2']
// ['messages', 'conv-123']
// ['messages', 'conv-456']
```

**Benefits:**
- Automatic deduplication (same key = same request)
- Granular invalidation (invalidate specific conversations)
- Hierarchical invalidation (invalidate all messages)

---

## 4. Conditional Queries

### Enabled Option

```typescript
// Only fetch if we have a conversation ID
const { data: messages = [] } = useQuery({
  queryKey: ['messages', activeConversationId],
  queryFn: () => activeConversationId 
    ? getMessages(activeConversationId) 
    : Promise.resolve([]),
  enabled: !!activeConversationId  // Don't run without ID
})
```

### Pattern: Dependent Queries

```typescript
// First query: Get user
const { data: user } = useQuery({
  queryKey: ['user'],
  queryFn: getUser
})

// Second query: Get user's projects (depends on user)
const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: () => getProjects(user!.id),
  enabled: !!user  // Only run after user is loaded
})
```

---

## 5. API Client Functions

API functions are pure async functions that return data:

```typescript
// From frontend/lib/api/conversations.ts
import { UUID, Conversation, Message } from '@/types/apiTypes'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

// Get auth token helper
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('printer_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

// Fetch conversations for a chat node
export const getConversationsForNode = async (chatNodeId: string): Promise<Conversation[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations?chat_node_id=${chatNodeId}`,
    { headers: getAuthHeaders() }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.statusText}`)
  }
  
  return response.json()
}

// Fetch messages for a conversation
export const getMessages = async (conversationId: UUID): Promise<Message[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
    { headers: getAuthHeaders() }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`)
  }
  
  return response.json()
}

// Create a new conversation
export const createConversation = async (data: {
  project_id: UUID
  chat_node_id: string
}): Promise<Conversation> => {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create conversation')
  }
  
  return response.json()
}
```

**Patterns:**
- Return typed data (Promise<Conversation[]>)
- Throw errors for non-ok responses
- Centralize auth header logic
- Use environment variables for base URL

---

## 6. useMutation: Creating/Updating Data

Mutations are for operations that change data on the server:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const createConversationMutation = useMutation({
  mutationFn: () => createConversation({
    project_id: projectId,
    chat_node_id: chatNodeId
  }),
  
  onSuccess: (newConversation) => {
    // Invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
    
    toast.success('Conversation created')
  },
  
  onError: (error: Error) => {
    toast.error(`Failed: ${error.message}`)
  }
})

// Usage
<Button onClick={() => createConversationMutation.mutate()}>
  Create Conversation
</Button>
```

---

## 7. Mutation Lifecycle

### Complete Lifecycle Hooks

```typescript
const renameMutation = useMutation({
  mutationFn: ({ id, title }: { id: UUID; title: string }) =>
    updateConversation({ conversation_id: id, title }),
  
  // 1. Before mutation runs (for optimistic updates)
  onMutate: async ({ id, title }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['conversations', chatNodeId] })
    
    // Snapshot previous value for rollback
    const previousConversations = queryClient.getQueryData<Conversation[]>(
      ['conversations', chatNodeId]
    )
    
    // Optimistic update
    if (previousConversations) {
      queryClient.setQueryData<Conversation[]>(
        ['conversations', chatNodeId],
        previousConversations.map(conv =>
          conv.id === id ? { ...conv, title } : conv
        )
      )
    }
    
    // Return context for rollback
    return { previousConversations }
  },
  
  // 2. Success handler
  onSuccess: () => {
    toast.success('Renamed successfully')
  },
  
  // 3. Error handler (rollback optimistic update)
  onError: (error, variables, context) => {
    // Rollback to previous value
    if (context?.previousConversations) {
      queryClient.setQueryData(
        ['conversations', chatNodeId],
        context.previousConversations
      )
    }
    toast.error(`Failed: ${error.message}`)
  },
  
  // 4. Always runs (success or error)
  onSettled: () => {
    // Refetch to ensure sync with server
    queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
  }
})
```

---

## 8. Cache Invalidation

### Invalidate Queries

```typescript
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })

// Invalidate all messages queries
queryClient.invalidateQueries({ queryKey: ['messages'] })

// Invalidate with prefix matching
queryClient.invalidateQueries({
  queryKey: ['messages'],
  exact: false  // Matches all keys starting with ['messages']
})
```

### Remove Queries

```typescript
// Remove from cache completely
queryClient.removeQueries({ queryKey: ['messages', conversationId] })

// Remove all messages
queryClient.removeQueries({ queryKey: ['messages'] })
```

### Refetch Queries

```typescript
// Force refetch (doesn't mark as stale first)
await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })
```

---

## 9. Optimistic Updates

Show changes immediately, then sync with server:

```typescript
// From frontend/components/nodes/ChatNode.tsx
const handleSendMessage = async () => {
  const optimisticUserMessage: Message = {
    id: crypto.randomUUID() as UUID,
    conversation_id: activeConversationId,
    role: 'user',
    content: currentMessage,
    timestamp: new Date().toISOString(),
  }
  
  // Add to UI immediately
  queryClient.setQueryData<Message[]>(
    ['messages', activeConversationId],
    (old = []) => [...old, optimisticUserMessage]
  )
  
  // Start streaming (adds AI response)
  startStreaming({
    user_message: currentMessage,
    // ...
  })
}
```

**Flow:**
1. Add optimistic message to cache
2. UI updates immediately
3. Start streaming
4. On complete, refetch to get real IDs and timestamps

---

## 10. Real-World Example: Message Flow

Let's trace a complete message send with React Query:

### 1. Initial Query (Load Messages)

```typescript
const { data: messages = [] } = useQuery({
  queryKey: ['messages', activeConversationId],
  queryFn: () => getMessages(activeConversationId),
  enabled: !!activeConversationId
})
```

### 2. User Sends Message (Optimistic Update)

```typescript
const handleSendMessage = () => {
  // Create optimistic message
  const optimisticMessage: Message = {
    id: crypto.randomUUID() as UUID,
    conversation_id: activeConversationId,
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  }
  
  // Update cache immediately
  queryClient.setQueryData<Message[]>(
    ['messages', activeConversationId],
    (old) => [...(old || []), optimisticMessage]
  )
  
  // Start API request
  startStreaming({ user_message: message, /* ... */ })
}
```

### 3. Streaming Completes

```typescript
const { startStreaming } = useStreamingChat({
  onComplete: async (fullResponse, conversationId, messageId) => {
    // Refetch messages to get real data from server
    await queryClient.refetchQueries({
      queryKey: ['messages', conversationId]
    })
    
    // Update active conversation if needed
    if (conversationId !== activeConversationId) {
      conversationStore.setActiveConversation(chatNodeId, conversationId)
      queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
    }
  }
})
```

### 4. Cache Updates

React Query automatically:
- Replaces optimistic data with real data
- Updates UI without flickering
- Maintains scroll position
- Deduplicates requests

---

## 11. Delete with Cache Cleanup

```typescript
const deleteConversationMutation = useMutation({
  mutationFn: (id: UUID) => deleteConversation(id),
  
  onSuccess: () => {
    // Invalidate conversations list
    queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
    
    // Remove messages cache for deleted conversation
    if (conversationToDelete === activeConversationId) {
      queryClient.removeQueries({ queryKey: ['messages', conversationToDelete] })
    }
    
    toast.success('Conversation deleted')
  }
})
```

---

## 12. Loading and Error States

React Query provides granular loading states:

```typescript
const { data, isLoading, isRefetching, isError, error } = useQuery({
  queryKey: ['messages'],
  queryFn: getMessages
})

// isLoading: First load (no cached data)
// isRefetching: Background refetch (has cached data)
// isError: Query failed
// error: Error object

if (isLoading) {
  return <LoadingSpinner />
}

if (isError) {
  return <ErrorMessage error={error} />
}

return <MessageList messages={data} />
```

### Mutation States

```typescript
const { mutate, isPending, isError, isSuccess } = useMutation({
  mutationFn: createConversation
})

<Button
  onClick={() => mutate()}
  disabled={isPending}
>
  {isPending ? 'Creating...' : 'Create'}
</Button>
```

---

## 13. Stale Time vs Cache Time

### Stale Time

How long data is considered fresh:

```typescript
useQuery({
  queryKey: ['messages'],
  queryFn: getMessages,
  staleTime: 30 * 1000  // Fresh for 30 seconds
})

// Within 30 seconds: Use cached data, no refetch
// After 30 seconds: Still use cached data, but refetch in background
```

### Cache Time (Garbage Collection)

How long unused data stays in cache:

```typescript
useQuery({
  queryKey: ['messages'],
  queryFn: getMessages,
  cacheTime: 5 * 60 * 1000  // Keep in cache for 5 minutes after unused
})

// Data removed from cache 5 minutes after last component unmounts
```

---

## 14. Dependent Mutations

Chain mutations with proper error handling:

```typescript
// Create conversation, then send message
const handleSendFirstMessage = async () => {
  try {
    // 1. Create conversation
    const newConversation = await createConversationMutation.mutateAsync()
    
    // 2. Send message in new conversation
    startStreaming({
      conversation_id: newConversation.id,
      user_message: message
    })
  } catch (error) {
    toast.error('Failed to create conversation')
  }
}
```

---

## 15. Query Options Best Practices

```typescript
// From frontend/components/nodes/ChatNode.tsx
const { data: conversations = [] } = useQuery({
  queryKey: ['conversations', chatNodeId],
  queryFn: () => getConversationsForNode(chatNodeId),
  staleTime: 5 * 60 * 1000,  // 5 minutes (conversations change infrequently)
  enabled: !!chatNodeId,      // Only run if we have a chat node ID
})

const { data: messages = [] } = useQuery({
  queryKey: ['messages', activeConversationId],
  queryFn: () => getMessages(activeConversationId),
  staleTime: 30 * 1000,       // 30 seconds (messages change frequently)
  enabled: !!activeConversationId,
})
```

**Guidelines:**
- Short staleTime for frequently changing data
- Long staleTime for rarely changing data
- Always use `enabled` for conditional queries
- Always provide default values (= [])

---

## 16. DevTools

React Query DevTools help debug queries:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Features:**
- View all queries and their state
- Inspect cached data
- Manually trigger refetches
- See query timelines
- Debug mutations

---

## 17. Integration with Streaming

React Query works seamlessly with streaming:

```typescript
const {
  isStreaming,
  streamedText,
  startStreaming
} = useStreamingChat({
  onComplete: async (fullResponse, conversationId, messageId) => {
    // When streaming completes, refetch messages
    await queryClient.refetchQueries({
      queryKey: ['messages', conversationId]
    })
    
    // Updates UI with persisted message (includes real ID)
  }
})

// Show streaming text in real-time
{isStreaming && (
  <div>{streamedText}</div>
)}
```

---

## Key Takeaways

1. **useQuery**: Fetch data with automatic caching
2. **useMutation**: Create/update/delete data
3. **Query Keys**: Hierarchical caching and invalidation
4. **Optimistic Updates**: Instant UI feedback
5. **Lifecycle Hooks**: onMutate, onSuccess, onError, onSettled
6. **Cache Management**: Invalidate, remove, refetch
7. **Stale Time**: How long data is fresh
8. **Enabled Queries**: Conditional fetching
9. **Loading States**: isLoading, isRefetching, isPending
10. **Error Handling**: Automatic retry, error states

---

## Best Practices

1. **Type everything** - Use TypeScript for queries and mutations
2. **Consistent query keys** - Use arrays with consistent structure
3. **API client functions** - Separate API logic from React Query
4. **Handle errors** - Always show user feedback
5. **Optimistic updates** - For instant UI feedback
6. **Invalidate carefully** - Only invalidate what changed
7. **Default values** - Always provide `= []` or `= {}`
8. **Conditional queries** - Use `enabled` to prevent unnecessary requests
9. **Stale time tuning** - Adjust based on data change frequency
10. **Cleanup on delete** - Remove related queries from cache

---

## Next Steps

Now you can:
- Fetch data efficiently with automatic caching
- Implement optimistic updates for instant feedback
- Manage mutations with proper error handling
- Integrate streaming with React Query
- Debug queries using DevTools

React Query is the data layer - it manages all server state!

