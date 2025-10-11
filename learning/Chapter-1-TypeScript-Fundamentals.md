# Chapter 1: TypeScript Fundamentals & Modern JavaScript

## Overview

TypeScript is a statically-typed superset of JavaScript that adds type safety to your code. In the Printer AI frontend, TypeScript ensures that data flowing between components, state managers, and APIs is correctly structured, preventing runtime errors and improving developer experience.

---

## 1. TypeScript Basics

### Interfaces vs Types

**Interfaces** define the shape of objects and can be extended:

```typescript
// From frontend/types/apiTypes.ts
export interface User {
  id: UUID
  email: string
  created_at: string
}

export interface Message {
  id: UUID
  conversation_id: UUID
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
```

**Type Aliases** can represent any type, including primitives, unions, and intersections:

```typescript
// UUID is a branded type alias
export type UUID = string

// Union type for message roles
type MessageRole = 'user' | 'assistant'
```

**When to use which:**
- Use **interfaces** for object shapes that might be extended
- Use **type aliases** for unions, intersections, and primitive aliases

---

## 2. Generics

Generics allow you to write reusable code that works with multiple types while maintaining type safety.

### Example from React Flow

```typescript
// From @xyflow/react library
type Node<T = any> = {
  id: string
  type?: string
  position: { x: number; y: number }
  data: T  // Generic type parameter
}

// Usage in our codebase
export interface ChatNodeData extends Omit<ChatCardPosition, 'x' | 'y'> {
  projectId: string
  [key: string]: any
}

export type ChatNode = Node<ChatNodeData>
```

Here, `Node<T>` is a generic type where `T` represents the type of the `data` property. When we create `ChatNode`, we specify `ChatNodeData` as the generic parameter.

---

## 3. Utility Types

TypeScript provides built-in utility types for common type transformations:

### Omit<Type, Keys>

Removes specified keys from a type:

```typescript
// From frontend/types/reactFlowTypes.ts
export interface ChatNodeData extends Omit<ChatCardPosition, 'x' | 'y'> {
  projectId: string
}
```

This creates a new type with all properties from `ChatCardPosition` except `x` and `y`.

### Partial<Type>

Makes all properties optional:

```typescript
// Used in node updates
updateNode: (id: string, updates: Partial<Node>) => void
```

### Pick<Type, Keys>

Extracts specific keys from a type:

```typescript
type UserEmail = Pick<User, 'email'>
// Result: { email: string }
```

---

## 4. Union Types

Union types allow a value to be one of several types:

```typescript
// From frontend/stores/useCanvasStore.ts
type ContextType = "ai-chat" | "video" | "image" | "text" | "website" | "document"

// From frontend/types/reactFlowTypes.ts
export type CanvasNode = ChatNode | ContextNode | TextBlockNode | GoogleContextNode
```

Union types are powerful for representing values that can be multiple distinct types.

---

## 5. Type Narrowing

Type narrowing is the process of refining types within conditional blocks:

```typescript
// Type guard example
function isValidConnection(connection: Connection | Edge) {
  const sourceNode = nodes.find(n => n.id === connection.source)
  const targetNode = nodes.find(n => n.id === connection.target)
  
  // Type narrowing using optional chaining
  return (sourceNode?.type === 'contextNode' || 
          sourceNode?.type === 'textBlockNode') && 
          targetNode?.type === 'chatNode'
}
```

---

## 6. Modern JavaScript Features

### Destructuring

Extract properties from objects or arrays:

```typescript
// Object destructuring
const { user, token, isAuthenticated } = useAuthStore()

// With renaming
const { nodes: currentNodes, edges: currentEdges } = get()

// Array destructuring
const [message, setMessage] = useState('')
```

### Spread Operator

Copy and extend objects or arrays:

```typescript
// Object spread
const newNode = {
  ...existingNode,
  position: { x: 100, y: 200 },
  selected: true
}

// Array spread
const updatedNodes = [...state.nodes, newNode]
```

### Optional Chaining (?.)

Safely access nested properties:

```typescript
// From frontend/stores/useReactFlowStore.ts
const timestamp = parseInt(node.id.split('-')[2], 10)

// Safe version with optional chaining
const timestamp = node?.id?.split('-')?.[2]
```

### Nullish Coalescing (??)

Provide default values only for `null` or `undefined`:

```typescript
// From frontend/lib/api/streaming.ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000'

// Different from || which treats '', 0, false as falsy
const port = config.port ?? 8000  // Only uses 8000 if port is null/undefined
```

---

## 7. Async/Await Patterns

Modern asynchronous code uses async/await instead of callbacks:

```typescript
// From frontend/stores/useAuthStore.ts
login: async (email: string, password: string) => {
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  const data = await response.json()
  return data
}
```

**Key Points:**
- Functions using `await` must be marked `async`
- `await` pauses execution until the Promise resolves
- Errors can be caught with try/catch blocks
- Cleaner than `.then()` chains

---

## 8. Type Inference

TypeScript can often infer types without explicit annotations:

```typescript
// Type inferred as string
const message = "Hello"

// Type inferred as (id: string) => void
const deleteNode = (id: string) => {
  set(state => ({
    nodes: state.nodes.filter(node => node.id !== id)
  }))
}

// Type inferred from return value
const getProjectId = (): UUID | null => {
  if (data?.projectId) {
    return String(data.projectId) as UUID
  }
  return null
}
```

---

## 9. Type Assertions

Sometimes you know more about a type than TypeScript does:

```typescript
// Type assertion with 'as'
const userId = localStorage.getItem('user_id') as UUID

// Type assertion with angle brackets (JSX conflicts)
const userId = <UUID>localStorage.getItem('user_id')

// Non-null assertion operator (!)
const currentProject = projectId!  // Asserts projectId is not null
```

**Warning:** Use type assertions sparingly - they bypass type checking!

---

## 10. Discriminated Unions

Use a common property to distinguish between union types:

```typescript
// From frontend/types/reactFlowTypes.ts
type ChatNode = {
  type: 'chatNode'
  data: ChatNodeData
}

type ContextNode = {
  type: 'contextNode'
  data: ContextNodeData
}

type CanvasNode = ChatNode | ContextNode

// TypeScript can narrow the type based on 'type' property
function handleNode(node: CanvasNode) {
  if (node.type === 'chatNode') {
    // TypeScript knows node.data is ChatNodeData here
    console.log(node.data.projectId)
  }
}
```

---

## 11. Index Signatures

Allow dynamic property access on objects:

```typescript
// From frontend/types/reactFlowTypes.ts
export interface ChatNodeData extends Omit<ChatCardPosition, 'x' | 'y'> {
  projectId: string
  [key: string]: any  // Index signature
}
```

This allows:
```typescript
const data: ChatNodeData = {
  projectId: '123',
  customProperty: 'value'  // Allowed by index signature
}
```

---

## 12. Real-World Example: Message Type Flow

Let's trace how a `Message` type flows through the application:

### 1. API Response (Backend → Frontend)

```typescript
// Backend returns JSON that matches this interface
export interface Message {
  id: UUID
  conversation_id: UUID
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}
```

### 2. API Client Function

```typescript
// frontend/lib/api/conversations.ts
export const getMessages = async (conversationId: UUID): Promise<Message[]> => {
  const response = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return response.json()  // TypeScript knows this returns Message[]
}
```

### 3. React Query

```typescript
// frontend/components/nodes/ChatNode.tsx
const { data: messages = [] } = useQuery<Message[]>({
  queryKey: ['messages', activeConversationId],
  queryFn: () => activeConversationId ? getMessages(activeConversationId) : Promise.resolve([])
})
```

### 4. Rendering in UI

```typescript
// TypeScript ensures type safety throughout
{messages.map((msg: Message) => (
  <div key={msg.id}>
    <div>{msg.content}</div>
    <div>{new Date(msg.timestamp).toLocaleTimeString()}</div>
  </div>
))}
```

**Benefits:**
- Autocomplete for all properties (`msg.` shows id, content, role, etc.)
- Type checking prevents typos (`msg.contnet` would be a compile error)
- Refactoring is safe (rename `content` to `text` and TypeScript finds all usages)

---

## Key Takeaways

1. **Type Safety**: TypeScript catches errors at compile time, not runtime
2. **Developer Experience**: Autocomplete and IntelliSense make coding faster
3. **Documentation**: Types serve as inline documentation for your code
4. **Refactoring**: Types make large-scale refactoring safe and predictable
5. **Team Collaboration**: Types create clear contracts between different parts of the codebase

---

## Common Patterns in Printer AI

1. **UUID Type**: String alias for database IDs
2. **Interface Extension**: Building complex types from simpler ones
3. **Generic Nodes**: React Flow nodes with custom data types
4. **Union Types**: Representing multiple possible states (node types, message roles)
5. **Optional Properties**: Using `?` for properties that may not exist
6. **Type Guards**: Narrowing types in conditional logic

---

## Next Steps

After mastering TypeScript fundamentals, you'll be ready to understand:
- How React components use these types for props and state
- How Zustand stores leverage TypeScript for type-safe state management
- How API integration maintains type safety from backend to UI

The type system is the foundation that makes the entire frontend codebase predictable and maintainable.

