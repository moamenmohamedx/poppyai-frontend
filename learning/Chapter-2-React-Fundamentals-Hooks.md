# Chapter 2: React Fundamentals & Hooks

## Overview

React is a JavaScript library for building user interfaces through composable components. The Printer AI frontend uses React 19 with functional components and hooks, representing the modern approach to React development.

---

## 1. Functional Components

Functional components are JavaScript functions that return JSX (React's syntax extension for describing UI).

### Basic Component Structure

```typescript
// From frontend/app/page.tsx
export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [currentView, setCurrentView] = useState<"dashboard" | "canvas">("dashboard")

  return (
    <main className="min-h-screen bg-gray-50">
      {currentView === "dashboard" ? (
        <Dashboard />
      ) : (
        <Canvas />
      )}
    </main>
  )
}
```

**Key Points:**
- Component names must start with a capital letter
- Components return JSX (looks like HTML but is JavaScript)
- Can use JavaScript expressions inside `{curly braces}`
- Must return a single root element (or use fragments `<>...</>`)

---

## 2. Props: Passing Data to Components

Props (properties) are how parent components pass data to children.

### Defining Props with TypeScript

```typescript
// From frontend/components/nodes/ChatNode.tsx
interface ChatNodeProps extends NodeProps {
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function ChatNode({ id, data, selected, onNodeContextMenu }: ChatNodeProps) {
  // Component logic
  return <div>...</div>
}
```

### Props are Read-Only

```typescript
// ❌ WRONG - Props are immutable
function ChatNode({ data }) {
  data.projectId = '123'  // Error: Cannot modify props
}

// ✅ CORRECT - Create new state based on props
function ChatNode({ data }) {
  const [projectId, setProjectId] = useState(data.projectId)
}
```

---

## 3. useState: Managing Component State

`useState` creates a state variable that persists between re-renders.

### Basic Usage

```typescript
// From frontend/components/nodes/ChatNode.tsx
const [message, setMessage] = useState('')
const [showContextMenu, setShowContextMenu] = useState(false)
const [renameValue, setRenameValue] = useState('')
```

**Syntax:**
```typescript
const [stateValue, setStateFunction] = useState(initialValue)
```

### State Updates are Asynchronous

```typescript
// ❌ WRONG - State not updated immediately
setMessage('Hello')
console.log(message)  // Still shows old value!

// ✅ CORRECT - Use the new value directly or in useEffect
setMessage('Hello')
sendMessage('Hello')  // Use the value you're setting
```

### Functional Updates

When new state depends on old state, use a function:

```typescript
// ❌ WRONG - May use stale state
setCount(count + 1)

// ✅ CORRECT - Function receives current state
setCount(prevCount => prevCount + 1)
```

### Example from useStreamingChat

```typescript
// From frontend/hooks/useStreamingChat.ts
const [streamedText, setStreamedText] = useState('')

// Accumulating tokens uses functional update
onToken: (data) => {
  setStreamedText((prev) => prev + data.token)
}
```

---

## 4. useEffect: Side Effects and Lifecycle

`useEffect` runs code after render for side effects like API calls, subscriptions, and DOM manipulation.

### Basic Syntax

```typescript
useEffect(() => {
  // Effect code runs after render
  
  return () => {
    // Cleanup code runs before next effect or unmount
  }
}, [dependencies])
```

### Lifecycle Patterns

#### Component Mount (runs once)

```typescript
// From frontend/hooks/useStreamingChat.ts
useEffect(() => {
  return () => {
    if (cleanupRef.current) {
      console.log('Cleaning up on unmount')
      cleanupRef.current()
    }
  }
}, [])  // Empty dependency array = mount/unmount only
```

#### Watch Specific Values

```typescript
// From frontend/components/nodes/ChatNode.tsx
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
  }
}, [messages])  // Runs whenever messages changes
```

#### Cleanup Functions

Cleanup prevents memory leaks and stale event listeners:

```typescript
// From frontend/components/ReactFlowCanvas.tsx
useEffect(() => {
  const handleClickOutside = () => {
    setShowContextMenu(false)
  }

  if (showContextMenu) {
    document.addEventListener('click', handleClickOutside)
    
    return () => {
      // Cleanup: remove listener when effect re-runs or component unmounts
      document.removeEventListener('click', handleClickOutside)
    }
  }
}, [showContextMenu])
```

### Common useEffect Patterns

#### 1. Data Fetching (Now handled by React Query)

```typescript
// Old pattern (don't use)
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(setData)
}, [])

// Modern pattern with React Query
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData
})
```

#### 2. Event Listeners

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete') {
      handleDelete()
    }
  }
  
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [handleDelete])
```

#### 3. Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth changed:', event)
  })
  
  return unsubscribe
}, [])
```

---

## 5. useCallback: Memoizing Functions

`useCallback` returns a memoized version of a function that only changes when dependencies change.

### Why useCallback?

```typescript
// Without useCallback - new function created every render
const handleClick = () => {
  console.log('clicked')
}

// With useCallback - same function reference unless dependencies change
const handleClick = useCallback(() => {
  console.log('clicked')
}, [])
```

### Real Example

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const handleContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  
  const flowPosition = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY
  })
  setContextMenuPosition(flowPosition)
  setShowContextMenu(true)
}, [screenToFlowPosition])  // Only recreate if screenToFlowPosition changes
```

### When to Use useCallback

1. **Passing functions as props** to memoized child components
2. **Functions in useEffect dependencies** to prevent infinite loops
3. **Event handlers** that depend on changing values

---

## 6. useMemo: Memoizing Values

`useMemo` memoizes expensive computations, only recalculating when dependencies change.

### Syntax

```typescript
const memoizedValue = useMemo(() => {
  return expensiveComputation(a, b)
}, [a, b])  // Only recompute when a or b changes
```

### Real Example

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const nodeTypes = useMemo(() => createNodeTypes(handleNodeContextMenu), [handleNodeContextMenu])
```

### When to Use useMemo

1. **Expensive calculations** that don't need to run every render
2. **Creating object/array references** that should stay stable
3. **Optimizing child component renders**

---

## 7. useRef: Persisting Values Without Re-renders

`useRef` creates a mutable reference that persists across renders without causing re-renders when changed.

### Two Main Uses

#### 1. DOM References

```typescript
// From frontend/components/nodes/ChatNode.tsx
const messagesEndRef = useRef<HTMLDivElement>(null)

// Later in JSX
<div ref={messagesEndRef} className="flex-1 overflow-y-auto">
  {messages.map(...)}
</div>

// Access DOM node
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
  }
}, [messages])
```

#### 2. Mutable Values (Don't Trigger Re-renders)

```typescript
// From frontend/hooks/useStreamingChat.ts
const cleanupRef = useRef<(() => void) | null>(null)

// Store cleanup function
cleanupRef.current = cleanup

// Use in unmount cleanup
useEffect(() => {
  return () => {
    if (cleanupRef.current) {
      cleanupRef.current()
    }
  }
}, [])
```

### useState vs useRef

```typescript
// useState - Triggers re-render
const [count, setCount] = useState(0)
setCount(1)  // Component re-renders

// useRef - No re-render
const countRef = useRef(0)
countRef.current = 1  // No re-render!
```

---

## 8. Custom Hooks: Reusable Logic

Custom hooks are functions that use other hooks to encapsulate reusable logic.

### Complete Custom Hook Example

```typescript
// From frontend/hooks/useStreamingChat.ts
export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  // State
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<UUID | undefined>()
  
  // Ref for cleanup
  const cleanupRef = useRef<(() => void) | null>(null)
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])
  
  // Main function
  const startStreaming = useCallback((request: StreamingChatRequest) => {
    setStreamedText('')
    setIsStreaming(true)
    
    let fullResponse = ''
    
    const handlers: StreamEventHandlers = {
      onToken: (data) => {
        fullResponse += data.token
        setStreamedText((prev) => prev + data.token)
      },
      onStreamEnd: async (data) => {
        await options.onComplete?.(fullResponse, conversationId, messageId)
        setIsStreaming(false)
      }
    }
    
    const cleanup = streamChat(request, handlers)
    cleanupRef.current = cleanup
    
    return cleanup
  }, [options])
  
  const cancelStreaming = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
      setIsStreaming(false)
    }
  }, [])
  
  return {
    isStreaming,
    streamedText,
    currentConversationId,
    startStreaming,
    cancelStreaming,
  }
}
```

### Using the Custom Hook

```typescript
// From frontend/components/nodes/ChatNode.tsx
const {
  isStreaming,
  streamedText,
  startStreaming,
  cancelStreaming
} = useStreamingChat({
  onComplete: async (fullResponse, conversationId, messageId) => {
    await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })
  },
  onError: (error) => {
    toast.error(`❌ ${error}`)
  }
})
```

### Custom Hook Best Practices

1. **Name starts with "use"** - React convention
2. **Extract reusable logic** - Don't repeat yourself
3. **Return useful values and functions** - Make it easy to consume
4. **Handle cleanup properly** - Prevent memory leaks
5. **Use TypeScript** - Type your parameters and return values

---

## 9. React Component Lifecycle

Understanding when code runs in functional components:

### Lifecycle Phases

```typescript
function MyComponent() {
  // 1. INITIALIZATION - Runs every render
  const [state, setState] = useState(initialValue)
  
  // 2. MOUNT - Runs once after first render
  useEffect(() => {
    console.log('Component mounted')
    return () => console.log('Component unmounting')
  }, [])
  
  // 3. UPDATE - Runs when dependency changes
  useEffect(() => {
    console.log('State changed:', state)
  }, [state])
  
  // 4. RENDER - Returns JSX
  return <div>{state}</div>
}
```

### Order of Execution

```typescript
function Component() {
  console.log('1. Render phase')
  
  useEffect(() => {
    console.log('3. Effect runs after render')
    return () => console.log('4. Cleanup before next effect or unmount')
  })
  
  return <div>2. JSX returned</div>
}
```

---

## 10. Event Handling

React events are similar to DOM events but with some differences:

### Event Handler Syntax

```typescript
// From frontend/components/nodes/ChatNode.tsx
<input
  type="text"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && message.trim()) {
      e.preventDefault()
      handleSendMessage()
    }
  }}
/>
```

### Event Types

```typescript
// Mouse events
onClick={(e: React.MouseEvent) => {}}
onContextMenu={(e: React.MouseEvent) => {}}

// Keyboard events
onKeyDown={(e: React.KeyboardEvent) => {}}

// Form events
onChange={(e: React.ChangeEvent<HTMLInputElement>) => {}}
onSubmit={(e: React.FormEvent) => {}}
```

### Event Propagation

```typescript
// Stop event from bubbling up
onClick={(e) => {
  e.stopPropagation()
  handleClick()
}}

// Prevent default behavior
onSubmit={(e) => {
  e.preventDefault()
  submitForm()
}}
```

---

## 11. Conditional Rendering

Different ways to conditionally show/hide UI:

### Ternary Operator

```typescript
{isAuthenticated ? (
  <Dashboard />
) : (
  <Login />
)}
```

### Logical AND (&&)

```typescript
{isStreaming && <LoadingSpinner />}
{messages.length > 0 && <MessageList messages={messages} />}
```

### Early Return

```typescript
if (!projectId) {
  return <ErrorCard message="No project loaded" />
}

return <Canvas projectId={projectId} />
```

---

## 12. Lists and Keys

Rendering lists of items requires unique keys:

```typescript
// From frontend/components/nodes/ChatNode.tsx
{messages.map((msg) => (
  <div key={msg.id}>  {/* Key must be unique and stable */}
    <div>{msg.content}</div>
    <div>{new Date(msg.timestamp).toLocaleTimeString()}</div>
  </div>
))}
```

### Key Rules

1. **Must be unique** among siblings
2. **Should be stable** (don't use index if list can change)
3. **Help React identify** which items changed/added/removed

---

## 13. Real-World Example: useStreamingChat Lifecycle

Let's trace the complete lifecycle of the streaming chat hook:

### 1. Component Mount

```typescript
const ChatNode = () => {
  // Hook initializes
  const { isStreaming, streamedText, startStreaming } = useStreamingChat({
    onComplete: async (text, convId, msgId) => {
      await queryClient.refetchQueries({ queryKey: ['messages', convId] })
    }
  })
  
  // State: isStreaming = false, streamedText = ''
}
```

### 2. User Sends Message

```typescript
const handleSendMessage = async () => {
  // User clicks send button
  startStreaming({
    user_message: currentMessage,
    context_node_ids: contextNodeIds,
    project_id: projectId,
    chat_node_id: chatNodeId
  })
  
  // State updates: isStreaming = true
  // Component re-renders to show loading state
}
```

### 3. Tokens Arrive

```typescript
// SSE stream sends tokens
onToken: (data) => {
  // Each token updates state
  setStreamedText((prev) => prev + data.token)
  // Component re-renders with new text
}
```

### 4. Stream Completes

```typescript
onStreamEnd: async (data) => {
  // Call completion callback
  await options.onComplete?.(fullResponse, conversationId, messageId)
  
  // Update state
  setIsStreaming(false)
  // Component re-renders, shows complete message
}
```

### 5. Component Unmounts

```typescript
// Cleanup effect runs
useEffect(() => {
  return () => {
    if (cleanupRef.current) {
      cleanupRef.current()  // Aborts SSE stream
    }
  }
}, [])
```

---

## Key Takeaways

1. **Functional Components**: Functions that return JSX
2. **Props**: Read-only data passed from parent to child
3. **useState**: Creates reactive state that triggers re-renders
4. **useEffect**: Handles side effects and lifecycle events
5. **useCallback**: Memoizes functions to prevent unnecessary recreations
6. **useMemo**: Memoizes expensive computations
7. **useRef**: Creates mutable references that don't trigger re-renders
8. **Custom Hooks**: Encapsulate reusable logic
9. **Keys**: Help React identify list items
10. **Event Handling**: React synthetic events with TypeScript types

---

## Common Patterns in Printer AI

1. **State + Effect**: `useState` + `useEffect` for auto-scrolling messages
2. **Ref for Cleanup**: `useRef` storing cleanup functions in custom hooks
3. **Callback Memoization**: `useCallback` for event handlers passed to children
4. **Conditional Rendering**: Early returns for loading/error states
5. **Custom Hooks**: Extracting streaming logic into `useStreamingChat`

---

## Hook Rules (Critical!)

1. **Only call hooks at the top level** - Never inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Components or custom hooks
3. **Custom hooks must start with "use"** - Convention for tooling
4. **Dependencies must be exhaustive** - Include all values used inside effect/callback

---

## Next Steps

Now that you understand React fundamentals, you're ready to learn:
- How Zustand stores manage global state across components
- How Next.js handles routing and server/client components
- How complex UI interactions are built with these primitives

React hooks are the building blocks - everything else is built on top!

