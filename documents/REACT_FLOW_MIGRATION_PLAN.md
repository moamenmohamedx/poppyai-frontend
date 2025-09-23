# React Flow Migration Plan
## From Custom Canvas to React Flow Implementation

*Professional migration strategy following the 80/20 principle - deliver 80% of results with 20% of effort*

---

## 🎯 **Executive Summary**

**Current State**: Custom canvas implementation with manual SVG rendering, complex state management, and custom interaction handling across 469+ lines of canvas logic.

**Target State**: React Flow-powered canvas leveraging production-tested components, simplified state management, and built-in accessibility features.

**Key Benefit**: Reduce 80% of custom canvas complexity while gaining professional-grade features and future extensibility.

---

## 📊 **Current Implementation Analysis**

### **Strengths to Preserve**
- ✅ **Dual Card Types**: Chat & Context cards with different connection rules
- ✅ **Connection Logic**: Context cards → Chat cards only (business rule)
- ✅ **File Integration**: Drag & drop file uploads to canvas
- ✅ **State Management**: Zustand store with clean separation
- ✅ **UI Polish**: Smooth animations, visual feedback, connection states

### **Pain Points to Eliminate**
- ❌ **Manual SVG Rendering**: 50+ lines of custom edge path calculations
- ❌ **Custom Pan/Zoom**: Reinventing viewport management (80+ lines)
- ❌ **Connection Complexity**: Custom drag & drop connection system
- ❌ **Performance Overhead**: Manual re-renders and calculations
- ❌ **Accessibility Gaps**: No keyboard navigation or screen reader support

---

## 🚀 **Migration Strategy: 4 Phases**

### **Phase 1: Foundation Setup (2 hours)**
*Get React Flow running with minimal changes*

**Goals:**
- Replace custom canvas with React Flow container
- Maintain existing visual appearance
- Preserve current state structure

**Actions:**
1. **Install & Configure** (Already done: `@xyflow/react@12.8.5`)
   ```bash
   # Already installed in package.json ✓
   ```

2. **Create Base ReactFlow Wrapper**
   ```tsx
   // components/ReactFlowCanvas.tsx
   import { ReactFlow } from '@xyflow/react'
   import '@xyflow/react/dist/style.css'
   
   export default function ReactFlowCanvas() {
     return (
       <ReactFlow
         nodes={[]}
         edges={[]}
         fitView
       />
     )
   }
   ```

3. **Update Canvas.tsx Entry Point**
   - Replace manual canvas div with ReactFlowCanvas
   - Keep existing header and sidebar intact

**Success Criteria:**
- Empty React Flow canvas renders
- Existing UI chrome (header, sidebar) unchanged
- No breaking changes to current functionality

---

### **Phase 2: Node Migration (4 hours)**
*Convert cards to React Flow nodes*

**Goals:**
- Transform ChatCard and ContextCard to React Flow nodes
- Maintain all current card functionality
- Preserve drag & drop behavior

**Actions:**

1. **Create Node Type Mapping**
   ```tsx
   // types/reactFlowTypes.ts
   export interface ChatNodeData {
     id: string
     isMinimized: boolean
     // ... existing ChatCardPosition properties
   }
   
   export interface ContextNodeData {
     id: string
     type: "ai-chat" | "video" | "image" | "text" | "website" | "document"
     fileId?: string
     content?: any
     // ... existing ContextCardPosition properties
   }
   ```

2. **Convert Cards to Custom Nodes**
   ```tsx
   // components/nodes/ChatNode.tsx
   import { memo } from 'react'
   import { NodeProps } from '@xyflow/react'
   import ChatCard from '../ChatCard'
   
   function ChatNode({ data }: NodeProps<ChatNodeData>) {
     return <ChatCard card={data} projectId={data.projectId} />
   }
   
   export default memo(ChatNode)
   ```

3. **Transform Store Data**
   ```tsx
   // stores/useReactFlowStore.ts (new)
   const transformToNodes = (chatCards: ChatCardPosition[], contextCards: ContextCardPosition[]) => {
     const nodes = [
       ...chatCards.map(card => ({
         id: card.id,
         type: 'chatNode',
         position: { x: card.x, y: card.y },
         data: { ...card }
       })),
       ...contextCards.map(card => ({
         id: card.id,
         type: 'contextNode', 
         position: { x: card.x, y: card.y },
         data: { ...card }
       }))
     ]
     return nodes
   }
   ```

**Success Criteria:**
- All existing cards render as React Flow nodes
- Drag & drop positioning works
- Card interactions (minimize, close) function
- Visual appearance matches current design

---

### **Phase 3: Connection System Migration (3 hours)**
*Replace custom edges with React Flow connections*

**Goals:**
- Eliminate custom SVG edge rendering
- Use React Flow's connection system
- Maintain connection validation rules

**Actions:**

1. **Transform Edges Data**
   ```tsx
   const transformToEdges = (edges: Edge[]) => {
     return edges.map(edge => ({
       id: edge.id,
       source: edge.sourceId,
       target: edge.targetId,
       type: 'smoothstep', // Built-in curved edges
       animated: true,
       style: { stroke: '#6366f1', strokeWidth: 2 }
     }))
   }
   ```

2. **Replace Connection Logic**
   ```tsx
   // Remove 50+ lines of custom SVG rendering
   // Replace with React Flow's onConnect handler
   const onConnect = useCallback((params: Connection) => {
     // Validate connection rules
     const sourceNode = nodes.find(n => n.id === params.source)
     const targetNode = nodes.find(n => n.id === params.target)
     
     if (sourceNode?.type === 'contextNode' && targetNode?.type === 'chatNode') {
       setEdges(eds => addEdge(params, eds))
     }
   }, [nodes])
   ```

3. **Remove Legacy Code**
   - Delete `DynamicEdge.tsx` (61 lines eliminated)
   - Remove `renderEdges()` method from Canvas.tsx (50+ lines)
   - Simplify connection state in Zustand store

**Success Criteria:**
- Connections render with React Flow's built-in system  
- Connection validation rules maintained
- Smoother connection experience with built-in feedback
- 100+ lines of custom code eliminated

---

### **Phase 4: Enhanced Features & Polish (3 hours)**
*Leverage React Flow's advanced capabilities*

**Goals:**
- Add professional features with minimal effort
- Improve accessibility and UX
- Future-proof the implementation

**Actions:**

1. **Add Built-in Controls**
   ```tsx
   import { Controls, MiniMap, Background } from '@xyflow/react'
   
   <ReactFlow>
     <Background />
     <Controls />
     <MiniMap />
   </ReactFlow>
   ```

2. **Enhance Connection UX**
   ```tsx
   // Add connection handles to nodes
   <Handle
     type="source"
     position={Position.Right}
     isConnectable={data.type === 'context'}
   />
   <Handle
     type="target" 
     position={Position.Left}
     isConnectable={data.type === 'chat'}
   />
   ```

3. **Leverage Advanced Features**
   - **Auto-layout**: `useLayoutEffect` with dagre for smart positioning
   - **Keyboard Navigation**: Built-in accessibility 
   - **Connection Validation**: `isValidConnection` prop
   - **Performance**: Built-in virtualization for large canvases

**Success Criteria:**
- Mini-map for navigation
- Zoom controls with better UX
- Keyboard accessibility 
- Smooth performance with many nodes
- Professional polish matching industry standards

---

## 🔄 **State Management & Persistence Strategy**

### **Before: Custom Canvas Store (Non-Persistent)**
```tsx
// useCanvasStore.ts - 260 lines
- Manual position tracking
- Complex edge calculations  
- Custom zoom/pan state
- Connection state machine
- ❌ NO PERSISTENCE - State lost on app restart
```

### **After: React Flow + Supabase Persistence**
```tsx
// useReactFlowStore.ts + Supabase - ~150 lines
- React Flow handles positioning
- Built-in edge management
- Native viewport state
- ✅ AUTOMATIC PERSISTENCE per project
- ✅ Real-time state synchronization
- ✅ Version history & recovery
```

**Result: 60% reduction in state complexity + Full persistence**

---

## 💾 **Supabase Persistence Integration**

### **Database Schema Design**

```sql
-- Canvas state table for project persistence
CREATE TABLE canvas_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,  
  viewport jsonb NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one canvas state per project (latest version)
  UNIQUE(project_id)
);

-- Canvas history for version control & recovery
CREATE TABLE canvas_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_state_id uuid REFERENCES canvas_states(id) ON DELETE CASCADE,
  nodes jsonb NOT NULL,
  edges jsonb NOT NULL,
  viewport jsonb NOT NULL,
  change_type text CHECK (change_type IN ('auto_save', 'manual_save', 'restore')),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_canvas_states_project_id ON canvas_states(project_id);
CREATE INDEX idx_canvas_history_canvas_state_id ON canvas_history(canvas_state_id);
CREATE INDEX idx_canvas_history_created_at ON canvas_history(created_at);
```

### **Enhanced React Flow Store with Persistence**

```tsx
// stores/usePersistedReactFlowStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Node, Edge, Viewport } from '@xyflow/react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from './useProjectStore'

interface CanvasState {
  nodes: Node[]
  edges: Edge[] 
  viewport: Viewport
  metadata?: Record<string, any>
}

interface PersistedReactFlowStore {
  // Current state
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  
  // Persistence state
  isLoading: boolean
  isSaving: boolean
  lastSaved: Date | null
  isDirty: boolean
  autoSaveEnabled: boolean
  
  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  setViewport: (viewport: Viewport) => void
  
  // Persistence actions
  saveCanvasState: (projectId: string, force?: boolean) => Promise<void>
  loadCanvasState: (projectId: string) => Promise<void>
  enableAutoSave: (projectId: string, intervalMs?: number) => void
  disableAutoSave: () => void
  
  // History actions
  createSnapshot: (projectId: string, changeType: string) => Promise<void>
  restoreFromHistory: (historyId: string) => Promise<void>
  getHistory: (projectId: string) => Promise<any[]>
}

export const usePersistedReactFlowStore = create<PersistedReactFlowStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    isDirty: false,
    autoSaveEnabled: false,
    
    // State setters with dirty tracking
    setNodes: (nodes) => set((state) => ({ 
      nodes, 
      isDirty: true 
    })),
    
    setEdges: (edges) => set((state) => ({ 
      edges, 
      isDirty: true 
    })),
    
    setViewport: (viewport) => set((state) => ({ 
      viewport, 
      isDirty: true 
    })),
    
    // Save canvas state to Supabase
    saveCanvasState: async (projectId: string, force = false) => {
      const state = get()
      if (!state.isDirty && !force) return
      
      set({ isSaving: true })
      
      try {
        const canvasState = {
          project_id: projectId,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          updated_at: new Date().toISOString()
        }
        
        const { error } = await supabase
          .from('canvas_states')
          .upsert(canvasState, { 
            onConflict: 'project_id',
            ignoreDuplicates: false 
          })
          
        if (error) throw error
        
        set({ 
          isDirty: false, 
          lastSaved: new Date(),
          isSaving: false 
        })
        
        // Create history snapshot for major changes
        if (force) {
          await get().createSnapshot(projectId, 'manual_save')
        }
        
      } catch (error) {
        console.error('Failed to save canvas state:', error)
        set({ isSaving: false })
      }
    },
    
    // Load canvas state from Supabase
    loadCanvasState: async (projectId: string) => {
      set({ isLoading: true })
      
      try {
        const { data, error } = await supabase
          .from('canvas_states')
          .select('*')
          .eq('project_id', projectId)
          .single()
          
        if (error && error.code !== 'PGRST116') throw error
        
        if (data) {
          set({
            nodes: data.nodes || [],
            edges: data.edges || [],
            viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
            isDirty: false,
            lastSaved: new Date(data.updated_at)
          })
        } else {
          // No saved state - initialize empty canvas
          set({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
            isDirty: false,
            lastSaved: null
          })
        }
        
      } catch (error) {
        console.error('Failed to load canvas state:', error)
        // Initialize with empty state on error
        set({
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
          isDirty: false
        })
      } finally {
        set({ isLoading: false })
      }
    },
    
    // Enable auto-save with debouncing
    enableAutoSave: (projectId: string, intervalMs = 3000) => {
      const state = get()
      if (state.autoSaveEnabled) return
      
      set({ autoSaveEnabled: true })
      
      const autoSaveInterval = setInterval(() => {
        const currentState = get()
        if (currentState.isDirty && !currentState.isSaving) {
          currentState.saveCanvasState(projectId)
        }
      }, intervalMs)
      
      // Store interval ID for cleanup
      ;(get() as any)._autoSaveInterval = autoSaveInterval
    },
    
    disableAutoSave: () => {
      const state = get() as any
      if (state._autoSaveInterval) {
        clearInterval(state._autoSaveInterval)
        delete state._autoSaveInterval
      }
      set({ autoSaveEnabled: false })
    },
    
    // Create history snapshot
    createSnapshot: async (projectId: string, changeType: string) => {
      const state = get()
      
      try {
        // Get current canvas_state_id
        const { data: canvasData } = await supabase
          .from('canvas_states')
          .select('id')
          .eq('project_id', projectId)
          .single()
          
        if (canvasData) {
          await supabase
            .from('canvas_history')
            .insert({
              canvas_state_id: canvasData.id,
              nodes: state.nodes,
              edges: state.edges,
              viewport: state.viewport,
              change_type: changeType
            })
        }
      } catch (error) {
        console.error('Failed to create snapshot:', error)
      }
    },
    
    // Get project history
    getHistory: async (projectId: string) => {
      try {
        const { data, error } = await supabase
          .from('canvas_history')
          .select(`
            id,
            change_type,
            created_at,
            canvas_states!inner(project_id)
          `)
          .eq('canvas_states.project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(50)
          
        return data || []
      } catch (error) {
        console.error('Failed to get history:', error)
        return []
      }
    }
  }))
)

// Auto-save subscription
usePersistedReactFlowStore.subscribe(
  (state) => ({ nodes: state.nodes, edges: state.edges, viewport: state.viewport }),
  () => {
    // Mark as dirty when canvas state changes
    const state = usePersistedReactFlowStore.getState()
    if (!state.isDirty) {
      usePersistedReactFlowStore.setState({ isDirty: true })
    }
  },
  { equalityFn: (a, b) => 
    a.nodes.length === b.nodes.length &&
    a.edges.length === b.edges.length &&
    a.viewport.x === b.viewport.x &&
    a.viewport.y === b.viewport.y &&
    a.viewport.zoom === b.viewport.zoom
  }
)
```

### **Project Integration Hook**

```tsx
// hooks/useCanvasPersistence.ts
import { useEffect } from 'react'
import { usePersistedReactFlowStore } from '@/stores/usePersistedReactFlowStore'
import { useProjectStore } from '@/stores/useProjectStore'

export function useCanvasPersistence() {
  const { currentProject } = useProjectStore()
  const { 
    loadCanvasState, 
    saveCanvasState, 
    enableAutoSave, 
    disableAutoSave,
    isDirty 
  } = usePersistedReactFlowStore()
  
  // Load canvas state when project changes
  useEffect(() => {
    if (currentProject?.id) {
      loadCanvasState(currentProject.id)
      enableAutoSave(currentProject.id)
    } else {
      disableAutoSave()
    }
    
    return () => disableAutoSave()
  }, [currentProject?.id])
  
  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProject?.id && isDirty) {
        // Synchronous save for page unload
        saveCanvasState(currentProject.id, true)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentProject?.id, isDirty])
  
  return {
    isLoading: usePersistedReactFlowStore((state) => state.isLoading),
    isSaving: usePersistedReactFlowStore((state) => state.isSaving),
    lastSaved: usePersistedReactFlowStore((state) => state.lastSaved),
    isDirty: usePersistedReactFlowStore((state) => state.isDirty)
  }
}
```

### **Canvas Component Integration**

```tsx
// components/ReactFlowCanvas.tsx
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
import { usePersistedReactFlowStore } from '@/stores/usePersistedReactFlowStore' 
import { useCanvasPersistence } from '@/hooks/useCanvasPersistence'
import '@xyflow/react/dist/style.css'

export default function ReactFlowCanvas({ projectId }: { projectId: string }) {
  const {
    nodes,
    edges, 
    viewport,
    setNodes,
    setEdges,
    setViewport
  } = usePersistedReactFlowStore()
  
  const { isLoading, isSaving, lastSaved, isDirty } = useCanvasPersistence()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading canvas...</div>
      </div>
    )
  }
  
  return (
    <div className="relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          // Apply changes and update store
          const newNodes = applyNodeChanges(changes, nodes)
          setNodes(newNodes)
        }}
        onEdgesChange={(changes) => {
          const newEdges = applyEdgeChanges(changes, edges)
          setEdges(newEdges)
        }}
        onMove={(_event, viewport) => {
          setViewport(viewport)
        }}
        defaultViewport={viewport}
        fitView={false}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      
      {/* Save status indicator */}
      <div className="absolute top-4 right-4 text-sm text-gray-600 bg-white px-2 py-1 rounded shadow">
        {isSaving && "Saving..."}
        {!isSaving && isDirty && "Unsaved changes"}
        {!isSaving && !isDirty && lastSaved && `Saved ${lastSaved.toLocaleTimeString()}`}
        {!isSaving && !isDirty && !lastSaved && "No changes"}
      </div>
    </div>
  )
}
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Foundation** ☐
- [ ] Create ReactFlowCanvas wrapper component
- [ ] Import React Flow styles
- [ ] Replace canvas div with ReactFlow component  
- [ ] Verify rendering without breaking existing UI

### **Phase 2: Persistence Setup** ☐
- [ ] **Create Supabase database tables** (`canvas_states`, `canvas_history`)
- [ ] **Build usePersistedReactFlowStore** with save/load functionality
- [ ] **Create useCanvasPersistence hook** for auto-save integration
- [ ] **Test project-specific state loading** when switching projects
- [ ] **Verify auto-save works** with dirty tracking

### **Phase 3: Nodes** ☐
- [ ] Create ChatNode and ContextNode components
- [ ] Transform card data to node format
- [ ] Register custom node types
- [ ] Test drag & drop functionality
- [ ] **Verify node persistence** (positions, properties)

### **Phase 4: Connections** ☐
- [ ] Transform edge data to React Flow format
- [ ] Implement onConnect handler with validation
- [ ] Remove custom SVG rendering code
- [ ] Remove DynamicEdge component
- [ ] **Test connection persistence** (edges saved/loaded correctly)

### **Phase 5: Enhancement & Polish** ☐
- [ ] Add Controls, MiniMap, Background components
- [ ] Implement connection handles on nodes
- [ ] Add keyboard navigation support
- [ ] **Canvas history/versioning system**
- [ ] **Save status indicator UI**
- [ ] Performance testing with many nodes

---

## ⚡ **Key Benefits Achieved**

### **Developer Experience**
- **60% Less Code**: Eliminate 150+ lines of custom canvas logic
- **Better Maintainability**: Industry-standard patterns
- **Future Features**: Rich ecosystem of plugins/extensions

### **User Experience** 
- **Professional Polish**: Mini-map, better zoom controls
- **Accessibility**: Keyboard navigation, screen reader support
- **Performance**: Built-in virtualization and optimization

### **Business Value**
- **Faster Development**: New canvas features in hours vs days
- **Reduced Bugs**: Battle-tested React Flow components
- **Scalability**: Handles hundreds of nodes efficiently

---

## 🚨 **Risk Mitigation**

### **Potential Challenges**
1. **Learning Curve**: Team unfamiliarity with React Flow
   - *Solution*: 2-hour team workshop on React Flow basics
   
2. **Custom Feature Gaps**: Specific behaviors not in React Flow
   - *Solution*: Custom node/edge components (escape hatch available)
   
3. **Style Inconsistencies**: Default React Flow styles
   - *Solution*: CSS-in-JS or CSS modules for precise control

### **Rollback Strategy**
- Keep current Canvas.tsx as `LegacyCanvas.tsx`
- Feature flag for React Flow vs Legacy
- Gradual rollout to subset of users first

---

## 📅 **Timeline Estimate**

| Phase | Time | Priority |
|-------|------|----------|
| Phase 1: Foundation | 2 hours | Critical |
| Phase 2: Nodes | 4 hours | Critical | 
| Phase 3: Connections | 3 hours | Critical |
| Phase 4: Enhancement | 3 hours | High |
| **Total Development** | **12 hours** | |
| Testing & Polish | 4 hours | High |
| **Total Project** | **16 hours** | |

**2 developer-days for complete migration**

---

## 🎯 **Success Metrics**

### **Code Quality**
- [ ] 60%+ reduction in canvas-related code
- [ ] Zero accessibility violations
- [ ] 90%+ test coverage maintained

### **Performance**
- [ ] Support 100+ nodes without lag
- [ ] Smooth 60fps interactions
- [ ] < 200ms initial render time

### **User Experience**
- [ ] Feature parity with current implementation
- [ ] Enhanced navigation (mini-map, keyboard)
- [ ] Professional visual polish

---

*This migration plan follows industry best practices and the 80/20 principle to deliver maximum value with focused effort. The modular approach ensures minimal risk while achieving a professional, scalable canvas implementation.*
