# Chapter 3: State Management with Zustand

## Overview

Zustand is a lightweight state management library that provides a simpler alternative to Redux while maintaining powerful features. The Printer AI frontend uses Zustand to manage authentication, canvas state, conversations, and projects across components without prop drilling.

---

## 1. Why Zustand?

### Problems with useState + Props

```typescript
// ❌ Prop Drilling Problem
function App() {
  const [user, setUser] = useState(null)
  return <Dashboard user={user} setUser={setUser} />
}

function Dashboard({ user, setUser }) {
  return <Sidebar user={user} setUser={setUser} />
}

function Sidebar({ user, setUser }) {
  return <UserProfile user={user} setUser={setUser} />
}

// Props passed through multiple layers!
```

### Zustand Solution

```typescript
// ✅ Global State - No Prop Drilling
const useAuthStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))

// Any component can access directly
function UserProfile() {
  const user = useAuthStore((state) => state.user)
  return <div>{user?.email}</div>
}
```

---

## 2. Creating a Zustand Store

### Basic Store Structure

```typescript
import { create } from 'zustand'

interface CounterStore {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

const useCounterStore = create<CounterStore>((set) => ({
  // Initial state
  count: 0,
  
  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 })
}))
```

### Key Components

1. **`create()`**: Creates the store
2. **`set()`**: Updates state (provided by Zustand)
3. **`get()`**: Reads current state (provided by Zustand)
4. **TypeScript Interface**: Defines store shape

---

## 3. Reading State from the Store

### Selecting Specific Values (Recommended)

```typescript
// From frontend/components/nodes/ChatNode.tsx
const { isAuthenticated } = useAuthStore((state) => ({
  isAuthenticated: state.isAuthenticated
}))

// Shorthand for single value
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
```

**Benefits:**
- Component only re-renders when selected values change
- Better performance for large stores

### Reading Entire Store

```typescript
const authStore = useAuthStore()
// Has: user, token, isAuthenticated, login, logout, etc.
```

**When to use:**
- When you need multiple values
- In event handlers (doesn't cause re-renders)

---

## 4. Updating State with set()

### Object Merge (Shallow)

```typescript
// From frontend/stores/useAuthStore.ts
set({
  token: data.access_token,
  user: data.user,
  isAuthenticated: true
})

// Zustand merges with existing state
// Other properties remain unchanged
```

### Functional Updates

```typescript
// From frontend/stores/useReactFlowStore.ts
set((state) => ({
  nodes: [...state.nodes, newNode],
  chatNodeCount: state.chatNodeCount + 1
}))
```

**Use functional updates when:**
- New state depends on old state
- You need to access current state

### Replace Entire State

```typescript
set({ count: 0 }, true)  // Second parameter = replace, not merge
```

---

## 5. Authentication Store Example

Let's analyze the complete auth store:

```typescript
// From frontend/stores/useAuthStore.ts
import { create } from 'zustand'

interface AuthStore extends AuthState {
  // State
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  token: null,
  isAuthenticated: false,

  // Initialize from localStorage
  initializeAuth: () => {
    const token = localStorage.getItem('printer_auth_token')
    const userJson = localStorage.getItem('printer_auth_user')

    if (token && userJson) {
      const user = JSON.parse(userJson)
      set({
        token,
        user,
        isAuthenticated: true
      })
    }
  },

  // Login action with async logic
  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    // Update localStorage
    localStorage.setItem('printer_auth_token', data.access_token)
    localStorage.setItem('printer_auth_user', JSON.stringify(data.user))

    // Update Zustand state
    set({
      token: data.access_token,
      user: data.user,
      isAuthenticated: true
    })
  },

  // Logout action
  logout: () => {
    localStorage.removeItem('printer_auth_token')
    localStorage.removeItem('printer_auth_user')
    
    set({
      token: null,
      user: null,
      isAuthenticated: false
    })
  }
}))
```

### Usage in Components

```typescript
// Login component
function LoginForm() {
  const login = useAuthStore((state) => state.login)
  
  const handleSubmit = async (email, password) => {
    await login(email, password)
  }
}

// Protected route
function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  return <Dashboard />
}
```

---

## 6. Using get() for Current State

The `get()` function allows actions to read current state:

```typescript
// From frontend/stores/useReactFlowStore.ts
export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  
  deleteNode: async (id) => {
    const state = get()  // Get current state
    const nodeToDelete = state.nodes.find(node => node.id === id)

    if (nodeToDelete?.type === 'chatNode') {
      // Delete from backend
      await deleteChatNode(id)
    }
    
    // Update state
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== id),
      edges: state.edges.filter(edge => 
        edge.source !== id && edge.target !== id
      )
    }))
  }
}))
```

**When to use get():**
- In actions that need to read state before updating
- For conditional logic based on current state
- When you don't want to cause re-renders

---

## 7. Complex State: React Flow Store

The React Flow store demonstrates advanced patterns:

```typescript
// From frontend/stores/useReactFlowStore.ts
export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  // State
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  chatNodeCount: 0,
  contextNodeCount: 0,
  copiedNodes: [],
  copiedEdges: [],
  
  // Add chat node with validation
  addChatNode: (position, projectId) => {
    // Validate input
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot create node: No active project')
      return
    }
    
    set(state => {
      const newCount = state.chatNodeCount + 1
      const id = `chat-node-${newCount}`
      
      const newNode: Node<ChatNodeData> = {
        id,
        type: 'chatNode',
        position,
        data: {
          id,
          width: 400,
          height: 280,
          isMinimized: false,
          zIndex: 1,
          projectId
        }
      }
      
      return {
        nodes: [...state.nodes, newNode],
        chatNodeCount: newCount
      }
    })
  },
  
  // Copy nodes with edges
  copyNodes: (nodesToCopy) => {
    const { edges } = get()  // Read current edges
    
    // Find edges between selected nodes
    const nodeIds = nodesToCopy.map(n => n.id)
    const edgesToCopy = edges.filter(edge => 
      nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
    )
    
    set({ 
      copiedNodes: nodesToCopy,
      copiedEdges: edgesToCopy
    })
  },
  
  // Paste nodes with ID remapping
  pasteNodes: (position) => {
    const { copiedNodes, copiedEdges, chatNodeCount } = get()
    
    if (copiedNodes.length === 0) return
    
    // Calculate offset
    const firstNode = copiedNodes[0]
    const offsetX = position.x - firstNode.position.x
    const offsetY = position.y - firstNode.position.y
    
    // Create ID mapping for edges
    const idMap: Record<string, string> = {}
    let newChatCount = chatNodeCount
    
    const newNodes = copiedNodes.map(node => {
      let newId: string
      
      if (node.type === 'chatNode') {
        newChatCount++
        newId = `chat-node-${newChatCount}`
      } else {
        newId = `${node.id}-copy-${Date.now()}`
      }
      
      idMap[node.id] = newId
      
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY
        },
        data: { ...node.data, id: newId }
      }
    })
    
    // Remap edge IDs
    const newEdges = copiedEdges.map(edge => ({
      ...edge,
      id: `edge-${idMap[edge.source]}-${idMap[edge.target]}`,
      source: idMap[edge.source],
      target: idMap[edge.target]
    }))
    
    set(state => ({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
      chatNodeCount: newChatCount
    }))
  }
}))
```

### Patterns Demonstrated

1. **Validation before state updates**
2. **Using get() to read related state**
3. **Computing derived values**
4. **ID remapping for duplicated items**
5. **Coordinating multiple state updates**

---

## 8. Store Composition and Separation

Zustand encourages separating stores by domain:

```typescript
// Authentication
useAuthStore()     // user, token, login, logout

// Canvas
useCanvasStore()   // old system, being phased out

// React Flow
useReactFlowStore() // nodes, edges, viewport

// Conversations
useConversationStore() // active conversation per chat node

// Projects
useProjectStore()  // current project, projects list
```

### Accessing Multiple Stores

```typescript
// From frontend/components/nodes/ChatNode.tsx
function ChatNode() {
  // Access multiple stores
  const { deleteNode } = useReactFlowStore()
  const conversationStore = useConversationStore()
  const projectId = useProjectStore((state) => state.currentProject?.id)
  
  // Coordinate actions across stores
  const handleDeleteNode = async () => {
    await deleteNode(id)  // React Flow store
    conversationStore.clearConversation(id)  // Conversation store
  }
}
```

---

## 9. Outside React Components

Zustand stores can be accessed outside React components:

```typescript
// From frontend/stores/useReactFlowStore.ts
deleteNode: async (id) => {
  // Access conversation store directly
  const { useConversationStore } = await import('./useConversationStore')
  useConversationStore.getState().clearConversation(id)
  
  // Access global queryClient
  if ((window as any).queryClient) {
    const queryClient = (window as any).queryClient
    queryClient.removeQueries({ queryKey: ['conversations', id] })
  }
}
```

### getState() vs Hook

```typescript
// In React component (subscribes to changes)
const count = useStore((state) => state.count)

// Outside React (one-time read, no subscription)
const count = useStore.getState().count

// Call actions outside React
useStore.getState().increment()
```

---

## 10. Conversation Store: Specialized Pattern

The conversation store maintains a mapping of active conversations per chat node:

```typescript
// From frontend/stores/useConversationStore.ts
interface ConversationStore {
  activeConversations: Record<string, UUID>  // chatNodeId -> conversationId
  
  setActiveConversation: (chatNodeId: string, conversationId: UUID) => void
  getActiveConversation: (chatNodeId: string) => UUID | undefined
  clearConversation: (chatNodeId: string) => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  activeConversations: {},
  
  setActiveConversation: (chatNodeId, conversationId) => {
    set((state) => ({
      activeConversations: {
        ...state.activeConversations,
        [chatNodeId]: conversationId
      }
    }))
  },
  
  getActiveConversation: (chatNodeId) => {
    return get().activeConversations[chatNodeId]
  },
  
  clearConversation: (chatNodeId) => {
    set((state) => {
      const newConversations = { ...state.activeConversations }
      delete newConversations[chatNodeId]
      return { activeConversations: newConversations }
    })
  }
}))
```

### Usage

```typescript
// Set active conversation when user selects one
const handleSelectConversation = (conversationId: UUID) => {
  conversationStore.setActiveConversation(chatNodeId, conversationId)
}

// Get active conversation for queries
const activeConversationId = conversationStore.getActiveConversation(chatNodeId)

const { data: messages } = useQuery({
  queryKey: ['messages', activeConversationId],
  queryFn: () => getMessages(activeConversationId)
})
```

---

## 11. Performance Optimization

### Selector Functions

```typescript
// ❌ BAD - Component re-renders on ANY state change
const store = useAuthStore()

// ✅ GOOD - Only re-renders when user changes
const user = useAuthStore((state) => state.user)

// ✅ GOOD - Multiple values, still selective
const { user, isAuthenticated } = useAuthStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated
}))
```

### Shallow Comparison

```typescript
import { shallow } from 'zustand/shallow'

// Re-renders only if array contents change
const nodeIds = useReactFlowStore(
  (state) => state.nodes.map(n => n.id),
  shallow
)
```

---

## 12. Persistence (localStorage)

While Zustand has a persist middleware, Printer AI manually syncs with localStorage:

```typescript
// From frontend/stores/useAuthStore.ts

// Save to localStorage on login
login: async (email, password) => {
  const data = await loginApi(email, password)
  
  // 1. Save to localStorage
  localStorage.setItem('printer_auth_token', data.access_token)
  localStorage.setItem('printer_auth_user', JSON.stringify(data.user))
  
  // 2. Update Zustand state
  set({
    token: data.access_token,
    user: data.user,
    isAuthenticated: true
  })
}

// Restore from localStorage on app load
initializeAuth: () => {
  const token = localStorage.getItem('printer_auth_token')
  const userJson = localStorage.getItem('printer_auth_user')
  
  if (token && userJson) {
    set({
      token,
      user: JSON.parse(userJson),
      isAuthenticated: true
    })
  }
}
```

**Pattern:**
1. Update localStorage (synchronous)
2. Update Zustand state (triggers re-renders)
3. Initialize from localStorage on app startup

---

## 13. Real-World Example: Message Send Flow

Let's trace how multiple stores coordinate when sending a message:

### 1. User Clicks Send

```typescript
// ChatNode.tsx
const handleSendMessage = async () => {
  // 1. Get projectId from props or project store
  const projectId = data.projectId || useProjectStore.getState().currentProject?.id
  
  // 2. Get active conversation from conversation store
  const activeConversationId = conversationStore.getActiveConversation(chatNodeId)
  
  // 3. Get connected context nodes from React Flow store
  const { edges } = useReactFlowStore.getState()
  const contextNodeIds = edges
    .filter(edge => edge.target === chatNodeId)
    .map(edge => edge.source)
  
  // 4. Start streaming (managed by hook, not store)
  startStreaming({
    user_message: message,
    context_node_ids: contextNodeIds,
    project_id: projectId,
    chat_node_id: chatNodeId,
    conversation_id: activeConversationId
  })
}
```

### 2. Stream Completes

```typescript
// useStreamingChat.ts
onComplete: async (fullResponse, conversationId, messageId) => {
  // 1. Update active conversation if it changed
  if (conversationId !== activeConversationId) {
    conversationStore.setActiveConversation(chatNodeId, conversationId)
  }
  
  // 2. Invalidate React Query cache (not Zustand)
  await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })
}
```

**Key Insight:** Stores coordinate but don't directly depend on each other. They're loosely coupled.

---

## 14. Common Patterns in Printer AI

### Pattern 1: Validation Before Update

```typescript
addChatNode: (position, projectId) => {
  if (!projectId || projectId.trim() === '') {
    toast.error('Cannot create node: No active project')
    return  // Don't update state
  }
  
  set(state => ({ /* update */ }))
}
```

### Pattern 2: get() for Related Data

```typescript
copyNodes: (nodesToCopy) => {
  const { edges } = get()  // Read related state
  const edgesToCopy = edges.filter(/* ... */)
  set({ copiedNodes: nodesToCopy, copiedEdges: edgesToCopy })
}
```

### Pattern 3: Computed Updates

```typescript
set(state => ({
  nodes: [...state.nodes, newNode],
  chatNodeCount: state.chatNodeCount + 1  // Increment counter
}))
```

### Pattern 4: Selective Reading

```typescript
// In event handlers - don't cause re-renders
const handleClick = () => {
  const currentNodes = useReactFlowStore.getState().nodes
  // Process nodes
}
```

---

## Key Takeaways

1. **create()**: Creates a store with state and actions
2. **set()**: Updates state (shallow merge by default)
3. **get()**: Reads current state in actions
4. **Selectors**: Subscribe to specific state slices for performance
5. **Store Separation**: One store per domain (auth, canvas, conversations)
6. **Outside React**: Use getState() to access stores anywhere
7. **Async Actions**: Stores can contain async functions
8. **No Boilerplate**: Much simpler than Redux
9. **TypeScript**: Full type safety with interfaces
10. **Loose Coupling**: Stores coordinate but don't directly depend on each other

---

## Zustand vs Redux

| Feature | Zustand | Redux |
|---------|---------|-------|
| Boilerplate | Minimal | Extensive |
| Learning Curve | Easy | Steep |
| Bundle Size | ~1KB | ~3KB (core) + middleware |
| Async | Built-in | Requires middleware |
| DevTools | Available | Excellent |
| TypeScript | Excellent | Good |

---

## Best Practices

1. **Type everything** - Use TypeScript interfaces
2. **Separate by domain** - Don't create one mega-store
3. **Use selectors** - Subscribe to specific state slices
4. **Keep actions in store** - Don't scatter logic in components
5. **Validate inputs** - Check parameters before updating state
6. **Handle errors** - Show user feedback for async failures
7. **Document patterns** - Complex updates need comments

---

## Next Steps

Now that you understand Zustand, you can:
- See how Next.js components consume store state
- Understand how stores integrate with React Query
- Learn how canvas state persists to the backend
- Trace complete data flows across multiple stores

Zustand is your application's memory - it holds state that needs to outlive component lifecycles!

