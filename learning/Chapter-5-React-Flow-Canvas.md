# Chapter 5: React Flow Canvas Architecture

## Overview

React Flow is a library for building node-based editors and interactive diagrams. Printer AI uses React Flow to create a visual canvas where users can create chat nodes, context nodes, and connect them to build conversation contexts.

---

## 1. What is React Flow?

React Flow provides:
- **Nodes**: Draggable, custom UI elements
- **Edges**: Connections between nodes
- **Viewport**: Pan, zoom, and navigate the canvas
- **Handles**: Connection points on nodes
- **Minimap**: Overview of the entire canvas
- **Controls**: Zoom, fit view, lock interactions

### Installation

```bash
npm install @xyflow/react
```

---

## 2. Basic React Flow Setup

### Minimal Example

```typescript
import { ReactFlow, Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

function Canvas() {
  const nodes: Node[] = [
    {
      id: '1',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: 'Node 1' }
    },
    {
      id: '2',
      type: 'default',
      position: { x: 200, y: 100 },
      data: { label: 'Node 2' }
    }
  ]

  const edges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'smoothstep'
    }
  ]

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  )
}
```

---

## 3. Node Structure

### Node Anatomy

```typescript
interface Node<T = any> {
  id: string                  // Unique identifier
  type?: string               // Node type ('chatNode', 'contextNode')
  position: { x: number; y: number }  // Canvas position
  data: T                     // Custom data
  selected?: boolean          // Selection state
  draggable?: boolean        // Can be dragged?
  selectable?: boolean       // Can be selected?
}
```

### Printer AI Node Types

```typescript
// From frontend/types/reactFlowTypes.ts

// Chat node data
export interface ChatNodeData {
  id: string
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
  projectId: string
}

// Context node data
export interface ContextNodeData {
  id: string
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
  type: "video" | "image" | "text" | "website" | "document"
  fileId?: string
  content?: any
  projectId: string
}

// Text block node data
export interface TextBlockNodeData {
  id: string
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
  primaryText: string
  notesText: string
  projectId: string
}
```

---

## 4. Custom Node Components

### Creating Custom Nodes

```typescript
// From frontend/components/nodes/ChatNode.tsx
import { NodeProps, Handle, Position } from '@xyflow/react'

interface ChatNodeProps extends NodeProps {
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function ChatNode({ id, data, selected, onNodeContextMenu }: ChatNodeProps) {
  return (
    <div className={`react-flow-node ${selected ? 'ring-2 ring-purple-500' : ''}`}>
      {/* Connection handle */}
      <Handle
        id="chat-target"
        type="target"
        position={Position.Left}
        className="!bg-purple-500"
      />
      
      {/* Node UI */}
      <Card className="w-[700px] h-[700px]">
        <div className="flex items-center justify-between px-3 py-2">
          <span>AI Chat</span>
          <Button onClick={() => deleteNode(id)}>×</Button>
        </div>
        
        {/* Chat interface */}
        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id}>{msg.content}</div>
          ))}
        </div>
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
        />
      </Card>
    </div>
  )
}

export default memo(ChatNode)  // Memoize for performance
```

### Registering Custom Nodes

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const nodeTypes = useMemo(() => ({
  chatNode: (props) => <ChatNode {...props} onNodeContextMenu={handleContextMenu} />,
  contextNode: (props) => <ContextNode {...props} onNodeContextMenu={handleContextMenu} />,
  textBlockNode: (props) => <TextBlockNode {...props} onNodeContextMenu={handleContextMenu} />,
  googleContextNode: (props) => <GoogleContextNode {...props} onNodeContextMenu={handleContextMenu} />
}), [handleContextMenu])

return (
  <ReactFlow
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}  // Register custom nodes
  />
)
```

---

## 5. Handles: Connection Points

Handles are the points where edges connect to nodes.

### Handle Types

```typescript
<Handle
  type="source"   // Edges start from here
  position={Position.Right}
  id="context-source"
/>

<Handle
  type="target"   // Edges end here
  position={Position.Left}
  id="chat-target"
/>
```

### Handle Positioning

```typescript
import { Position } from '@xyflow/react'

Position.Top      // Handle at top of node
Position.Bottom   // Handle at bottom
Position.Left     // Handle at left
Position.Right    // Handle at right
```

### Styled Handles

```typescript
<Handle
  type="target"
  position={Position.Left}
  className="!bg-purple-500 !border-white"
  style={{ width: '20px', height: '20px' }}
  isConnectable={true}
/>
```

---

## 6. Edges: Connections Between Nodes

### Edge Structure

```typescript
interface Edge {
  id: string              // Unique identifier
  source: string          // Source node ID
  target: string          // Target node ID
  sourceHandle?: string   // Specific handle ID
  targetHandle?: string   // Specific handle ID
  type?: string           // Edge type
  animated?: boolean      // Animate the edge?
  style?: CSSProperties   // Custom styles
}
```

### Creating Edges

```typescript
// From frontend/stores/useReactFlowStore.ts
onConnect: (connection) => {
  const { nodes } = get()
  const sourceNode = nodes.find(n => n.id === connection.source)
  const targetNode = nodes.find(n => n.id === connection.target)
  
  // Validate: only context → chat or textBlock → chat
  if ((sourceNode?.type === 'contextNode' || sourceNode?.type === 'textBlockNode') 
      && targetNode?.type === 'chatNode') {
    
    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: 'context-source',
      targetHandle: 'chat-target',
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#a855f7',
        strokeWidth: 3,
        strokeDasharray: '5,5'
      }
    }
    
    set(state => ({
      edges: addEdge(newEdge, state.edges)
    }))
  }
}
```

### Edge Types

```typescript
type: 'default'     // Straight line
type: 'smoothstep'  // Rounded corners
type: 'step'        // Right angles
type: 'straight'    // Straight line
```

---

## 7. Viewport: Pan, Zoom, Navigation

### Viewport State

```typescript
interface Viewport {
  x: number      // Horizontal offset
  y: number      // Vertical offset
  zoom: number   // Zoom level (0.1 to 2.0 typically)
}
```

### Managing Viewport

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const handleViewportChange = useCallback((newViewport: Viewport) => {
  setViewport(newViewport)  // Save to store
}, [setViewport])

<ReactFlow
  defaultViewport={viewport}
  onViewportChange={handleViewportChange}
/>
```

### Programmatic Navigation

```typescript
import { useReactFlow } from '@xyflow/react'

function MyComponent() {
  const { setViewport, fitView, zoomIn, zoomOut } = useReactFlow()
  
  const centerView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 })
  }
  
  const fitAllNodes = () => {
    fitView({ padding: 0.2 })
  }
}
```

---

## 8. Node State Management with Zustand

### Store Structure

```typescript
// From frontend/stores/useReactFlowStore.ts
export interface ReactFlowStore {
  // State
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  
  // Node management
  addChatNode: (position: { x: number; y: number }, projectId: string) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => Promise<void>
  
  // Edge management
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  onConnect: (connection: Connection) => void
  
  // Utility
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setViewport: (viewport: Viewport) => void
  hydrate: (state: { nodes: Node[], edges: Edge[], viewport: Viewport }) => void
}
```

### Adding Nodes

```typescript
addChatNode: (position, projectId) => {
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
}
```

---

## 9. Node Changes and Updates

### Handling Node Changes

```typescript
// From frontend/components/ReactFlowCanvas.tsx
import { applyNodeChanges, NodeChange } from '@xyflow/react'

const handleNodesChange = useCallback((changes: NodeChange[]) => {
  const updatedNodes = applyNodeChanges(changes, nodes)
  setNodes(updatedNodes)
}, [nodes, setNodes])

<ReactFlow
  nodes={nodes}
  onNodesChange={handleNodesChange}
/>
```

### Node Change Types

```typescript
// Position change (drag)
{ id: '1', type: 'position', position: { x: 100, y: 200 } }

// Selection change
{ id: '1', type: 'select', selected: true }

// Dimensions change
{ id: '1', type: 'dimensions', dimensions: { width: 400, height: 300 } }

// Remove
{ id: '1', type: 'remove' }
```

---

## 10. Connection Validation

### Preventing Invalid Connections

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const isValidConnection = useCallback((connection: Connection | Edge) => {
  const sourceNode = nodes.find(n => n.id === connection.source)
  const targetNode = nodes.find(n => n.id === connection.target)
  
  // Only allow context → chat connections
  return (
    (sourceNode?.type === 'contextNode' || 
     sourceNode?.type === 'textBlockNode' ||
     sourceNode?.type === 'googleContextNode') &&
    targetNode?.type === 'chatNode'
  )
}, [nodes])

<ReactFlow
  isValidConnection={isValidConnection}
/>
```

### Visual Feedback

```css
/* Valid connection */
.react-flow__connection-path {
  stroke: #10b981;  /* Green */
}

/* Invalid connection */
.react-flow__connection-path.invalid {
  stroke: #ef4444;  /* Red */
}
```

---

## 11. Coordinate Transformation

### Screen to Flow Position

```typescript
import { useReactFlow } from '@xyflow/react'

function MyComponent() {
  const { screenToFlowPosition } = useReactFlow()
  
  const handleDrop = (e: DragEvent) => {
    // Convert screen coordinates to flow coordinates
    const flowPosition = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY
    })
    
    addNode(flowPosition)
  }
}
```

**Why needed?** The canvas can be panned and zoomed, so screen coordinates don't match canvas coordinates.

---

## 12. Drag and Drop

### File Drop on Canvas

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setIsDragOverCanvas(false)

  const bounds = reactFlowWrapper.current!.getBoundingClientRect()
  
  const position = screenToFlowPosition({
    x: e.clientX - bounds.left,
    y: e.clientY - bounds.top
  })

  const files = Array.from(e.dataTransfer.files)
  files.forEach(file => {
    let contextType = 'document'
    
    if (file.type.startsWith('image/')) contextType = 'image'
    else if (file.type.startsWith('video/')) contextType = 'video'
    
    addContextNode(contextType as any, position, projectId)
  })
}, [screenToFlowPosition, addContextNode, projectId])

<ReactFlow
  onDrop={handleDrop}
  onDragOver={(e) => e.preventDefault()}
/>
```

---

## 13. Context Menu

### Canvas Right-Click Menu

```typescript
// From frontend/components/ReactFlowCanvas.tsx
const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
const [showContextMenu, setShowContextMenu] = useState(false)

const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
  event.preventDefault()
  
  const flowPosition = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY
  })
  
  setContextMenuPosition(flowPosition)
  setContextMenuScreenPosition({ x: event.clientX, y: event.clientY })
  setShowContextMenu(true)
}, [screenToFlowPosition])

<ReactFlow
  onPaneContextMenu={handlePaneContextMenu}
/>

{/* Custom context menu */}
{showContextMenu && (
  <div
    style={{
      position: 'fixed',
      left: contextMenuScreenPosition.x,
      top: contextMenuScreenPosition.y
    }}
  >
    <button onClick={handleCopy}>Copy</button>
    <button onClick={handlePaste}>Paste</button>
    <button onClick={handleDelete}>Delete</button>
  </div>
)}
```

---

## 14. Keyboard Shortcuts

### Copy, Paste, Delete

```typescript
// From frontend/components/ReactFlowCanvas.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement) {
      return
    }

    // Copy: Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      const selectedNodes = nodes.filter(node => node.selected)
      if (selectedNodes.length > 0) {
        copyNodes(selectedNodes)
      }
    }
    
    // Paste: Ctrl+V or Cmd+V
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      pasteNodes(lastRightClickPosition || centerPosition)
    }
    
    // Delete: Delete key
    if (e.key === 'Delete') {
      e.preventDefault()
      deleteSelectedNodes()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [nodes, copyNodes, pasteNodes, deleteSelectedNodes])
```

---

## 15. Minimap and Controls

### Minimap

```typescript
import { MiniMap } from '@xyflow/react'

<ReactFlow>
  <MiniMap
    position="bottom-right"
    nodeColor={(node) => {
      return node.type === 'chatNode' ? '#a855f7' : '#22d3ee'
    }}
    pannable
    zoomable
  />
</ReactFlow>
```

### Controls

```typescript
import { Controls } from '@xyflow/react'

<ReactFlow>
  <Controls
    position="bottom-left"
    showZoom
    showFitView
    showInteractive
  />
</ReactFlow>
```

### Background

```typescript
import { Background } from '@xyflow/react'

<ReactFlow>
  <Background
    gap={20}
    size={1}
    color="#d1d5db"
  />
</ReactFlow>
```

---

## 16. Panel: Custom Overlay

```typescript
import { Panel } from '@xyflow/react'

<ReactFlow>
  <Panel position="top-left">
    <div className="bg-white px-3 py-2 rounded-lg shadow-md">
      <div className="text-sm font-medium text-green-600">
        ✓ React Flow Canvas
      </div>
      <div className="text-xs text-gray-500">
        Nodes: {nodes.length} | Edges: {edges.length}
      </div>
    </div>
  </Panel>
</ReactFlow>
```

---

## 17. Theme Integration

### Dark Mode

```typescript
import { useTheme } from 'next-themes'

function ReactFlowCanvas() {
  const { theme, systemTheme } = useTheme()
  const currentTheme = theme === 'system' ? systemTheme : theme
  
  return (
    <ReactFlow
      style={{ 
        backgroundColor: currentTheme === 'dark' ? undefined : 'hsl(214.3, 31.8%, 91.4%)' 
      }}
      colorMode={currentTheme === 'dark' ? 'dark' : 'light'}
    >
      <Background 
        gap={20}
        className="dark:bg-pattern-black"
      />
    </ReactFlow>
  )
}
```

---

## 18. Real-World Example: Context Collection

Let's see how context nodes connect to chat nodes and pass their content:

### 1. User Creates Nodes

```typescript
// User drags file onto canvas
addContextNode('document', position, projectId)

// User creates chat node
addChatNode(centerPosition, projectId)
```

### 2. User Connects Them

```typescript
// User drags from context node's source handle to chat node's target handle
onConnect: (connection) => {
  // Validate connection
  if (isValidConnection(connection)) {
    const newEdge = {
      id: `edge-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
      animated: true
    }
    
    set(state => ({
      edges: [...state.edges, newEdge]
    }))
  }
}
```

### 3. User Sends Message

```typescript
// ChatNode.tsx
const getConnectedContextNodeIds = (): string[] => {
  const { edges } = useReactFlowStore.getState()
  
  // Find edges where this chat node is the target
  const connectedEdges = edges.filter(edge => edge.target === id)
  
  // Extract source node IDs (context nodes)
  return connectedEdges.map(edge => edge.source)
}

const handleSendMessage = async () => {
  const contextNodeIds = getConnectedContextNodeIds()
  
  // Send to backend with context
  startStreaming({
    user_message: message,
    context_node_ids: contextNodeIds,  // Backend fetches content
    project_id: projectId,
    chat_node_id: id
  })
}
```

### 4. Backend Receives Context

```python
# Backend fetches content for each context node ID
for node_id in context_node_ids:
    node_content = fetch_node_content(node_id)
    context_texts.append(node_content)

# Build prompt with context
prompt = build_prompt(user_message, context_texts)
```

---

## Key Takeaways

1. **Nodes**: Custom UI elements with typed data
2. **Edges**: Connections between nodes with validation
3. **Handles**: Connection points (source/target)
4. **Viewport**: Pan, zoom, navigation state
5. **Store Integration**: Zustand manages nodes, edges, viewport
6. **Coordinate Transform**: screenToFlowPosition() for accurate positioning
7. **Custom Components**: Memoized React components for each node type
8. **Connection Validation**: Only specific node types can connect
9. **Keyboard Shortcuts**: Copy, paste, delete
10. **Theme Support**: Dark/light mode integration

---

## Best Practices

1. **Memoize node components** - Use `memo()` to prevent unnecessary re-renders
2. **Type everything** - Strong types for nodes, edges, data
3. **Validate connections** - Prevent invalid node connections
4. **Handle cleanup** - Remove related edges when deleting nodes
5. **Coordinate transforms** - Always use `screenToFlowPosition()`
6. **Persist viewport** - Save zoom/pan state
7. **Keyboard shortcuts** - Improve UX with standard shortcuts
8. **Performance** - Use selectors in Zustand for minimal re-renders

---

## Next Steps

Now that you understand React Flow:
- Learn how UI components are built with shadcn/ui
- See how React Query manages data fetching in nodes
- Understand how streaming integrates with chat nodes
- Master the complete canvas persistence workflow

React Flow is the visual foundation - everything else builds on top of it!

