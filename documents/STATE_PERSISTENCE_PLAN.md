# State Persistence Planning Document (Single User)
## AI Context Organizer - Canvas State Management

### Assumptions
1. **No authentication initially** - single user setup for development
2. Auth will be added later as a separate layer
3. Canvas state snapshots are preferred over incremental updates
4. All projects belong to single user (no user_id needed yet)
5. React Flow handles node/edge rendering; we persist positions and data

---

## 1. Supabase Data Model

### Core Tables

```sql
-- Projects table (no user_id for now)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- unique project names
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ,
  thumbnail TEXT, -- base64 mini canvas preview
  
  -- Canvas viewport state
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'

-- Canvas snapshots (main persistence mechanism)
CREATE TABLE canvas_states (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  
  -- React Flow state as JSONB
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  
  -- Metadata
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

### Row Level Security (RLS) - Disabled for Single User

```sql
-- RLS disabled for single-user development
-- Will be enabled when auth is added later

-- For now, using anon key gives full access
-- This is fine for local development
```

---

## 2. Supabase Client Setup (80/20 Essentials)

```bash
# 1. Install deps
npm install @supabase/supabase-js use-debounce

# 2. Add to .env.local
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)
```

---

## 3. Serialization Format

### Node Structure (stored in JSONB)
```typescript
interface PersistedNode {
  id: string
  type: 'chatNode' | 'contextNode'
  position: { x: number; y: number }
  data: {
    // Common fields
    width: number
    height: number
    isMinimized: boolean
    zIndex: number
    
    // Context node specific
    contextType?: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document'
    content?: any
    
    // Chat node specific
    messages?: Array<{
      id: string
      type: 'user' | 'ai'
      content: string
      timestamp: string
      citations?: string[]
    }>
  }
}

interface PersistedEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: 'smoothstep'
  animated: boolean
  style: object
}
```

---

## 4. CRUD Operations Flow

### Create Project
```typescript
// 1. Create project in DB (no user_id needed)
const project = await supabase
  .from('projects')
  .insert({ 
    name, 
    viewport: { x: 0, y: 0, zoom: 1 }
  })
  .select()
  .single()

// 2. Create empty canvas state
await supabase
  .from('canvas_states')
  .insert({
    project_id: project.id,
    nodes: [],
    edges: [],
    version: 1
  })

// 3. Update local store
useProjectStore.addProject(project)
```

### Load Project Canvas
```typescript
// 1. Fetch project with canvas state
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    canvas_states(*)
  `)
  .eq('id', projectId)
  .single()

// 2. Hydrate React Flow store and viewport
useReactFlowStore.setState({ 
  nodes: data.canvas_states?.nodes || [], 
  edges: data.canvas_states?.edges || [],
  viewport: data.viewport 
})

// 3. Update last opened
await supabase
  .from('projects')
  .update({ last_opened_at: new Date() })
  .eq('id', projectId)
```

### Save Canvas State (Debounced)
```typescript
// Debounce saves every 2 seconds of changes
const saveCanvas = useDebouncedCallback(async () => {
  const { nodes, edges, viewport } = useReactFlowStore.getState()
  
  // 1. Clean and serialize canvas elements.
  // This strips temporary UI state like 'selected' or 'dragging' before persistence.
  const cleanNodes = nodes.map(({ id, type, position, data, width, height, zIndex }) => ({
    id, type, position, data, width, height, zIndex
  }));

  const cleanEdges = edges.map(({ id, source, target, sourceHandle, targetHandle, type, animated, style }) => ({
    id, source, target, sourceHandle, targetHandle, type, animated, style
  }));

  // 2. Upsert (replace) canvas state for nodes and edges
  await supabase
    .from('canvas_states')
    .upsert({
      project_id: currentProjectId,
      nodes: JSON.stringify(cleanNodes),
      edges: JSON.stringify(cleanEdges),
      version: 1 // Always v1 for now
    }, {
      onConflict: 'project_id'
    })
    
  // 3. Update project viewport and timestamp
  await supabase
    .from('projects')
    .update({ 
      viewport: viewport,
      updated_at: new Date() 
    })
    .eq('id', currentProjectId)
}, 2000)
```

---

## 5. React Integration Pattern

### Viewport Sync (80/20 Implementation)
```typescript
// Add to useReactFlowStore.ts
export interface ReactFlowStore {
  // ... existing
  viewport: { x: number; y: number; zoom: number }
  setViewport: (viewport: Viewport) => void
  hydrate: (state: { nodes: Node[], edges: Edge[], viewport: Viewport }) => void
}

// In create()
viewport: { x: 0, y: 0, zoom: 1 },
setViewport: (viewport) => set({ viewport }),
hydrate: ({ nodes, edges, viewport }) => set({ nodes, edges, viewport })
```

```typescript
// Update ReactFlowCanvas.tsx
const { viewport, setViewport } = useReactFlowStore()

<ReactFlow
  defaultViewport={viewport}
  onViewportChange={setViewport}
  fitView={false}
  // ... rest
/>
```


### Project Context Provider
```typescript
// app/providers/ProjectProvider.tsx
export function ProjectProvider({ children }) {
  const [currentProject, setCurrentProject] = useState(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  
  // Auto-save on canvas changes (nodes, edges, or viewport)
  useEffect(() => {
    if (!currentProject) return
    
    const unsubscribe = useReactFlowStore.subscribe(
      (state) => ({ 
        nodes: state.nodes, 
        edges: state.edges, 
        viewport: state.viewport 
      }),
      (canvasState) => {
        setSaveStatus('saving')
        saveCanvas(currentProject.id, canvasState)
          .then(() => setSaveStatus('saved'))
      }
    )
    
    return unsubscribe
  }, [currentProject])
  
  return <ProjectContext.Provider value={{ currentProject, setCurrentProject, saveStatus }}>
    {children}
  </ProjectContext.Provider>
}
```

### Canvas Component Lifecycle
```typescript
// components/ReactFlowCanvas.tsx
function ReactFlowCanvas({ projectId }) {
  const { setNodes, setEdges, viewport, onViewportChange } = useReactFlowStore()
  const [loading, setLoading] = useState(true)
  
  // Load on mount
  useEffect(() => {
    loadCanvasState(projectId).then(state => {
      // Hydrates the store, which will set nodes, edges, and viewport
      setLoading(false)
    })
  }, [projectId])
  
  // Save indicator
  const { saveStatus } = useProjectContext()
  
  return (
    <>
      {saveStatus === 'saving' && <Badge>Saving...</Badge>}
      <ReactFlow 
        nodes={nodes} 
        edges={edges}
        defaultViewport={viewport}
        onMove={(_, viewport) => onViewportChange(viewport)}
      />
    </>
  )
}
```

---

## 6. Real-time Sync (Optional for v1)

### Presence Only (No Conflict Resolution)
```typescript
// Subscribe to project presence
const channel = supabase.channel(`project:${projectId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // Show who else is viewing (read-only)
  })
  .subscribe()
```

For v1, skip real-time canvas sync to avoid complexity. Use last-write-wins with manual refresh.

---

## 7. Edge Cases & Solutions

### Large Canvas (100+ nodes)
- **Solution**: Compress JSONB with `pglz` (automatic in Postgres)
- **Limit**: Soft cap at 500 nodes with user warning

### Stale Canvas After Offline Edit
- **Solution**: Show "Refresh to sync" banner on reconnect
- **Future**: Implement version comparison

### Cross-tab Editing
- **Solution**: Use localStorage broadcast channel
```typescript
// Detect same project open in multiple tabs
const bc = new BroadcastChannel(`project-${projectId}`)
bc.postMessage({ type: 'canvas-update', nodes, edges })
```

### Deleted Nodes Referenced by Edges
- **Solution**: Clean orphaned edges on load
```typescript
const validEdges = edges.filter(e => 
  nodes.some(n => n.id === e.source) && 
  nodes.some(n => n.id === e.target)
)
```

---

## 8. Implementation Checklist

### Phase 1: Database Setup (Day 1)
- [ ] Create Supabase project
- [ ] Run migration SQL for tables (no auth/RLS)
- [ ] Create TypeScript types from DB schema
- [ ] Test basic CRUD via Supabase dashboard
- [ ] Verify anon key has full access

### Phase 2: Persistence Layer (Day 2)
- [ ] Create `lib/supabase/client.ts`
- [ ] Create `lib/supabase/projects.ts` with CRUD functions
- [ ] Create `hooks/useProject.ts` for data fetching
- [ ] Add save/load to `useReactFlowStore`
- [ ] Implement debounced auto-save

### Phase 3: UI Integration (Day 3)
- [ ] Update Dashboard to list all projects (no filtering)
- [ ] Add project creation flow
- [ ] Wire up Canvas to load/save state
- [ ] Add save status indicator
- [ ] Add error toasts

### Phase 4: Testing & Polish (Day 4)
- [ ] Manual testing of all CRUD operations
- [ ] Test with 50+ nodes performance
- [ ] Add loading skeletons
- [ ] Handle network errors gracefully
- [ ] Add "Unsaved changes" warning

---

## 9. Testing Plan

### Unit Tests
```typescript
// __tests__/serialization.test.ts
- Serialize/deserialize nodes preserves all fields
- Edge validation removes orphans
- Large canvas compression works

// __tests__/supabase.test.ts
- CRUD operations with mock client
- All operations work without auth
```

### Integration Tests
```typescript
// cypress/e2e/canvas-persistence.cy.ts
- Create project → Add nodes → Refresh → Nodes persist
- Open project → Edit → Navigate away → Return → Changes saved
- Delete project → Cascading cleanup verified
```

### User Flow Tests
1. **Happy Path**: Create project → Build canvas → Close → Reopen → Exact restoration
2. **Multi-tab**: Open same project in 2 tabs → Edit tab 1 → Tab 2 shows stale warning
3. **Offline**: Go offline → Edit canvas → Reconnect → Changes sync
4. **Large Canvas**: Add 100 nodes → Save time < 3s

---

## 10. Migration Strategy

For future schema changes:
```sql
-- Add version column to canvas_states
ALTER TABLE canvas_states ADD COLUMN schema_version INT DEFAULT 1;

-- Migration function in code
function migrateCanvasState(state: any, fromVersion: number) {
  if (fromVersion === 1 && currentVersion === 2) {
    // Transform v1 → v2
    return { ...state, newField: 'default' }
  }
  return state
}
```

---

## 11. Performance Targets

- **Project list load**: < 500ms for 50 projects
- **Canvas load**: < 1s for 100 nodes
- **Auto-save**: < 500ms for typical canvas
- **Memory usage**: < 50MB for 200 nodes

---

## Acceptance Criteria

✅ User can create/rename/delete projects from Dashboard  
✅ Each project has independent canvas state  
✅ Canvas restores exactly as left (positions, connections, data)  
✅ Auto-saves every 2 seconds after changes  
✅ Works offline with sync on reconnect  
✅ Shows save status indicator  
✅ Handles large canvases (100+ nodes) gracefully  
✅ No data loss on browser crash (last auto-save restored)  

---

## Next Steps

1. **Get Supabase credentials** and add to `.env.local`
2. **Run database migrations** via Supabase dashboard (no auth required)
3. **Start with Phase 1** implementation
4. **Test incrementally** - don't wait for full implementation
5. **Auth can be added later** as a separate layer on top

This plan follows the 80/20 principle: simple snapshot-based persistence for single user, with auth to be added later when needed.
