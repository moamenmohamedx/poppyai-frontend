# Chapter 10: Integration Points & Data Flow

## Overview

This chapter brings everything together, showing how the frontend connects to the backend, complete data flows through the system, and how to identify unused code. Understanding these integration points is crucial for maintaining and extending the application.

---

## 1. API Integration Points

### Base URL Configuration

```typescript
// Frontend uses environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'

// Backend runs on
// Development: http://localhost:8000
// Production: https://your-domain.com
```

### All API Endpoints

```typescript
// Authentication
POST   /api/auth/signup          // Create new user
POST   /api/auth/login           // Login user
POST   /api/auth/refresh         // Refresh access token

// Conversations
GET    /api/conversations?chat_node_id={id}    // Get conversations for node
POST   /api/conversations/                     // Create conversation
GET    /api/conversations/{id}/messages        // Get messages
PUT    /api/conversations/{id}                 // Update conversation (rename)
DELETE /api/conversations/{id}                 // Delete conversation

// Chat (Streaming)
POST   /api/chat/stream                        // Stream chat response (SSE)

// Chat Nodes
DELETE /api/chat-nodes/{id}                    // Delete chat node (and conversations)

// Projects
GET    /api/projects/                          // List user's projects
POST   /api/projects/                          // Create project
GET    /api/projects/{id}                      // Get project details
PUT    /api/projects/{id}                      // Update project
DELETE /api/projects/{id}                      // Delete project

// Google Integration (if enabled)
GET    /api/google/documents                   // List Google Drive documents
GET    /api/google/documents/{id}              // Get document content
POST   /api/google/auth/callback               // OAuth callback
```

---

## 2. Request/Response Type Contracts

### TypeScript Types Match Backend Models

```typescript
// Frontend: types/apiTypes.ts
export interface User {
  id: UUID
  email: string
  created_at: string
}

export interface Conversation {
  id: UUID
  title: string
  chat_node_id: string
  project_id: UUID
  created_at: string
  updated_at: string
}

export interface Message {
  id: UUID
  conversation_id: UUID
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
```

```python
# Backend: Pydantic models (backend/canvas_agent/conversations/schemas.py)
class User(BaseModel):
    id: UUID
    email: str
    created_at: datetime

class Conversation(BaseModel):
    id: UUID
    title: str
    chat_node_id: str
    project_id: UUID
    created_at: datetime
    updated_at: datetime

class Message(BaseModel):
    id: UUID
    conversation_id: UUID
    role: Literal['user', 'assistant']
    content: str
    timestamp: datetime
```

**Contracts enforce:**
- Consistent data shapes
- Type safety
- Documentation
- Compile-time errors for mismatches

---

## 3. Complete Data Flow: Sending a Message

Let's trace the complete flow when a user sends a message:

### Step 1: User Interaction

```typescript
// ChatNode.tsx - User types message and presses Enter
const [message, setMessage] = useState('Hello!')

<input
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleSendMessage()  // Trigger send
    }
  }}
/>
```

### Step 2: Collect Context

```typescript
// ChatNode.tsx - Get connected context nodes
const getConnectedContextNodeIds = (): string[] => {
  const { edges } = useReactFlowStore.getState()  // Get from Zustand
  
  // Find edges where this chat node is the target
  const connectedEdges = edges.filter(edge => edge.target === id)
  
  // Extract source node IDs
  return connectedEdges.map(edge => edge.source)
}

const contextNodeIds = getConnectedContextNodeIds()
// Result: ['context-node-1', 'text-block-node-2', 'google-context-3']
```

### Step 3: Optimistic Update

```typescript
// ChatNode.tsx - Add user message to UI immediately
const optimisticUserMessage: Message = {
  id: crypto.randomUUID() as UUID,
  conversation_id: activeConversationId,
  role: 'user',
  content: message,
  timestamp: new Date().toISOString(),
}

// Add to React Query cache
queryClient.setQueryData<Message[]>(
  ['messages', activeConversationId],
  (old) => [...(old || []), optimisticUserMessage]
)

// UI updates instantly - user sees their message
```

### Step 4: Start Streaming

```typescript
// ChatNode.tsx - Initiate SSE stream
startStreaming({
  user_message: message,
  context_node_ids: contextNodeIds,
  project_id: projectId,
  chat_node_id: chatNodeId,
  conversation_id: activeConversationId
})
```

### Step 5: HTTP Request

```typescript
// lib/api/streaming.ts - Send POST request
const response = await fetch(`${baseUrl}/api/chat/stream`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // From localStorage
  },
  body: JSON.stringify({
    user_message: "Hello!",
    context_node_ids: ['context-node-1', 'text-block-node-2'],
    project_id: "proj-123",
    chat_node_id: "chat-node-1",
    conversation_id: "conv-456"
  })
})
```

### Step 6: Backend Receives Request

```python
# Backend: chat/streaming.py
@router.post("/api/chat/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    # 1. Verify user owns the project
    # 2. Fetch context node contents
    # 3. Build prompt with context
    # 4. Stream LLM response
```

### Step 7: Backend Fetches Context

```python
# Backend fetches content for each context node ID
context_texts = []
for node_id in request.context_node_ids:
    node = await get_node_content(node_id, current_user.id)
    context_texts.append(node.content)

# context_texts = [
#   "Document content from context-node-1...",
#   "Text block content from text-block-node-2...",
#   "Google doc content from google-context-3..."
# ]
```

### Step 8: Backend Streams Response

```python
# Backend: Stream SSE events
async def event_generator():
    # Start event
    yield f"event: stream_start\ndata: {json.dumps({'status': 'streaming'})}\n\n"
    
    # Conversation ID (if new conversation)
    if not request.conversation_id:
        new_conversation = await create_conversation(...)
        yield f"event: conversation_id\ndata: {json.dumps({'conversation_id': str(new_conversation.id)})}\n\n"
    
    # Token stream from LLM
    async for token in llm.astream(prompt):
        yield f"event: message\ndata: {json.dumps({'token': token})}\n\n"
    
    # End event with message ID
    message_id = await save_message(conversation_id, full_response)
    yield f"event: stream_end\ndata: {json.dumps({'message_id': str(message_id), 'status': 'complete'})}\n\n"
```

### Step 9: Frontend Receives Tokens

```typescript
// lib/api/streaming.ts - Parse SSE events
onToken: (data) => {
  fullResponse += data.token
  setStreamedText((prev) => prev + data.token)  // Update UI
}

// UI updates in real-time as each token arrives
```

### Step 10: Stream Completes

```typescript
// hooks/useStreamingChat.ts
onStreamEnd: async (data) => {
  // Refetch messages from server
  await queryClient.refetchQueries({
    queryKey: ['messages', conversationId]
  })
  
  // React Query replaces optimistic data with real data
  // UI now shows message with real ID and timestamp
}
```

### Data Flow Summary

```
User Input
  ↓
React State (message)
  ↓
Zustand Store (get context node IDs)
  ↓
React Query (optimistic update)
  ↓
SSE Request → Backend
  ↓
Backend Fetches Context
  ↓
Backend Calls LLM
  ↓
SSE Stream → Frontend
  ↓
React State (streamedText updates)
  ↓
UI Re-renders (token by token)
  ↓
Stream Complete
  ↓
React Query (refetch)
  ↓
Zustand Store (update if new conversation)
  ↓
UI Final State
```

---

## 4. Canvas State Persistence

### Save Canvas to Backend

```typescript
// hooks/useAutoSaveCanvas.ts
const saveCanvas = async () => {
  const { nodes, edges, viewport } = useReactFlowStore.getState()
  
  // Serialize canvas state
  const canvasState = {
    nodes: nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    })),
    viewport: {
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom
    }
  }
  
  // Send to backend
  await fetch(`${API_BASE_URL}/api/projects/${projectId}/canvas`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(canvasState)
  })
}

// Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(saveCanvas, 30000)
  return () => clearInterval(interval)
}, [])
```

### Load Canvas from Backend

```typescript
// On project load
const loadCanvas = async (projectId: UUID) => {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/canvas`,
    { headers: getAuthHeaders() }
  )
  
  const canvasState = await response.json()
  
  // Hydrate React Flow store
  useReactFlowStore.getState().hydrate({
    nodes: canvasState.nodes,
    edges: canvasState.edges,
    viewport: canvasState.viewport
  })
}
```

---

## 5. Cross-Store Coordination

Multiple stores work together:

### Example: Deleting a Chat Node

```typescript
// useReactFlowStore.ts
deleteNode: async (id) => {
  // 1. Call backend to delete conversations and messages
  await fetch(`${API_BASE_URL}/api/chat-nodes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  
  // 2. Clear conversation store
  const { useConversationStore } = await import('./useConversationStore')
  useConversationStore.getState().clearConversation(id)
  
  // 3. Clear React Query cache
  if ((window as any).queryClient) {
    const queryClient = (window as any).queryClient
    queryClient.removeQueries({ queryKey: ['conversations', id] })
    queryClient.invalidateQueries({ queryKey: ['messages'], exact: false })
  }
  
  // 4. Remove from canvas
  set(state => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => 
      edge.source !== id && edge.target !== id
    )
  }))
}
```

**Coordination pattern:**
1. Backend (delete data)
2. Stores (clear related state)
3. React Query (invalidate caches)
4. UI (update visual state)

---

## 6. Environment Variables

### Frontend (.env.local)

```bash
# API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Critical:**
- Frontend: Only `NEXT_PUBLIC_*` variables are exposed to browser
- Backend: All variables are server-side only
- Never commit `.env` files to git

---

## 7. Dead Code Identification

### Components Not Imported

```bash
# Find all component files
find frontend/components -name "*.tsx"

# Check if component is imported anywhere
grep -r "import.*ComponentName" frontend/

# If no results → potentially unused
```

### Unused Exports

```typescript
// Check if exported functions are used
export const unusedFunction = () => {}  // ❌ Never imported

export const usedFunction = () => {}    // ✅ Imported in other files
```

### Old vs New Systems

```typescript
// Old canvas system (deprecated)
frontend/components/Canvas.tsx           // ❌ Not used
frontend/stores/useCanvasStore.ts        // ❌ Being phased out

// New React Flow system (current)
frontend/components/ReactFlowCanvas.tsx  // ✅ Active
frontend/stores/useReactFlowStore.ts     // ✅ Active
```

### Duplicate Code

```typescript
// frontend/app/providers.tsx
export function Providers() { ... }

// frontend/app/providers/ProjectProvider.tsx  
export function ProjectProvider() { ... }

// Check: Are both needed? Can they be merged?
```

---

## 8. Code Audit Checklist

### API Calls

- [ ] All API functions have error handling
- [ ] All API functions have TypeScript types
- [ ] Auth headers added to protected endpoints
- [ ] Base URL uses environment variable
- [ ] Responses are validated

### State Management

- [ ] No prop drilling (use Zustand for global state)
- [ ] Stores are separated by domain
- [ ] Selectors used for performance
- [ ] No stale closures in actions

### React Query

- [ ] Query keys are consistent and hierarchical
- [ ] Stale time configured appropriately
- [ ] Enabled option used for conditional queries
- [ ] Mutations have error handling
- [ ] Cache invalidation is correct

### Components

- [ ] Memoized with `memo()` if expensive
- [ ] Props are typed with TypeScript
- [ ] No unused props
- [ ] Event handlers use `useCallback`
- [ ] Expensive computations use `useMemo`

### Hooks

- [ ] Custom hooks start with "use"
- [ ] Dependencies are complete and correct
- [ ] Cleanup functions for side effects
- [ ] No conditional hooks

---

## 9. Integration Testing Points

### Critical Flows to Test

1. **Authentication**
   - Signup → Login → Access protected route
   - Token refresh
   - Logout → Cannot access protected route

2. **Canvas Management**
   - Create nodes → Connect → Send message with context
   - Save canvas → Reload → Canvas restored
   - Delete node → Conversations deleted

3. **Chat Streaming**
   - Send message → Stream starts → Tokens arrive → Stream completes
   - Cancel streaming mid-stream
   - Error handling

4. **React Query Caching**
   - Fetch data → Cache hit on re-render
   - Mutation → Cache invalidated → Refetch
   - Optimistic update → Real data replaces

---

## 10. Performance Optimization Points

### Bundle Size

```bash
# Analyze bundle
npm run build

# Check what's included
npx next build --analyze
```

### React Rendering

```typescript
// Use React DevTools Profiler
// Identify components that re-render unnecessarily

// Fix with:
// 1. memo() for components
// 2. useCallback() for functions
// 3. useMemo() for values
// 4. Zustand selectors
```

### API Calls

```typescript
// React Query handles:
// - Deduplication (multiple components, one request)
// - Caching (no unnecessary refetches)
// - Background refetching (keep data fresh)
```

---

## 11. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │   Next.js    │────►│    React     │────►│   Components  │  │
│  │  App Router  │     │  Components  │     │   (UI Layer)  │  │
│  └──────────────┘     └──────────────┘     └───────────────┘  │
│         │                     │                      │          │
│         │                     │                      │          │
│         ▼                     ▼                      ▼          │
│  ┌──────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │   Providers  │     │   Zustand    │     │ React Query   │  │
│  │ (React Query,│     │   Stores     │     │   (Cache)     │  │
│  │   Theme)     │     │ (Global State│     │               │  │
│  └──────────────┘     └──────────────┘     └───────────────┘  │
│                              │                      │           │
│                              │                      │           │
└──────────────────────────────┼──────────────────────┼───────────┘
                               │                      │
                               │     API Layer        │
                               │                      │
                               ▼                      ▼
                        ┌────────────────────────────────┐
                        │      HTTP / SSE Requests       │
                        │   (Authorization: Bearer)      │
                        └────────────────────────────────┘
                                       │
                                       │
┌──────────────────────────────────────┼──────────────────────────┐
│                    BACKEND           │                           │
├──────────────────────────────────────┼──────────────────────────┤
│                                      ▼                           │
│                        ┌────────────────────┐                   │
│                        │     FastAPI        │                   │
│                        │   (REST + SSE)     │                   │
│                        └────────────────────┘                   │
│                                  │                               │
│            ┌─────────────────────┼─────────────────────┐        │
│            │                     │                     │        │
│            ▼                     ▼                     ▼        │
│     ┌──────────┐         ┌──────────┐         ┌──────────┐    │
│     │   Auth   │         │   Chat   │         │ Projects │    │
│     │  Module  │         │  Module  │         │  Module  │    │
│     └──────────┘         └──────────┘         └──────────┘    │
│            │                     │                     │        │
│            └─────────────────────┼─────────────────────┘        │
│                                  │                               │
│                                  ▼                               │
│                        ┌────────────────────┐                   │
│                        │     Supabase       │                   │
│                        │   (PostgreSQL)     │                   │
│                        └────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **API Contracts**: TypeScript types match Pydantic models
2. **Data Flow**: User input → Stores → API → Backend → Stream → UI
3. **Context Collection**: Edges determine which context nodes connect
4. **Optimistic Updates**: Instant feedback, sync with server later
5. **Store Coordination**: Multiple stores work together seamlessly
6. **Canvas Persistence**: Save/load from backend
7. **Environment Variables**: Separate frontend/backend configuration
8. **Dead Code**: Audit regularly for unused components
9. **Performance**: React Query + memoization
10. **Integration Points**: Clear separation of concerns

---

## Best Practices

1. **Type everything** - Frontend and backend contracts
2. **Single source of truth** - Server is authoritative
3. **Optimistic updates** - For better UX
4. **Error handling** - At every integration point
5. **Environment variables** - Never hardcode
6. **Regular audits** - Remove dead code
7. **Performance monitoring** - React DevTools Profiler
8. **Document flows** - Complex integrations need diagrams
9. **Test integration points** - End-to-end tests
10. **Version APIs** - Plan for changes

---

## Final Thoughts

Understanding integration points is crucial because:

- **Debugging**: Know where data flows to find issues
- **Features**: Add new features without breaking existing ones
- **Refactoring**: Change implementation without changing contracts
- **Performance**: Identify bottlenecks in data flow
- **Maintenance**: Understand what code is actually used

The frontend and backend are separate applications that communicate through well-defined contracts. Keep those contracts clean, consistent, and well-documented!

---

## Congratulations! 🎉

You've completed the Frontend Study Plan! You now understand:

✅ TypeScript and modern JavaScript
✅ React components and hooks
✅ Zustand state management
✅ Next.js App Router
✅ React Flow canvas system
✅ shadcn/ui components and styling
✅ React Query for data fetching
✅ Server-Sent Events streaming
✅ Authentication flow
✅ Complete integration architecture

You're now equipped to:
- Build new features
- Debug issues
- Optimize performance
- Maintain the codebase
- Remove technical debt
- Mentor other developers

Keep learning, keep building, and enjoy working with Printer AI! 🚀

