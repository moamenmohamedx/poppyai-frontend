import { create } from 'zustand'
import { Node, Edge, addEdge, Connection, Viewport } from '@xyflow/react'
import { ChatNodeData, ContextNodeData } from '@/types/reactFlowTypes'

export interface ReactFlowStore {
  // State
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  
  // Node management
  addChatNode: (position: { x: number; y: number }) => void
  addContextNode: (type: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document', position: { x: number; y: number }) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  
  // Edge management  
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  
  // Utility
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  resetCanvas: () => void
  
  // Viewport
  setViewport: (viewport: Viewport) => void
  
  // Hydration
  hydrate: (state: { nodes: Node[], edges: Edge[], viewport: Viewport }) => void
  
  // Connection handling
  onConnect: (connection: Connection) => void

  // Internal counters
  chatNodeCount: number
  contextNodeCount: number
}

export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  // Initialize with empty arrays - nodes can be added via UI
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  chatNodeCount: 0,
  contextNodeCount: 0,
  
  addChatNode: (position) => {
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
          projectId: 'current-project' // This should come from context
        }
      }
      
      return {
        nodes: [...state.nodes, newNode],
        chatNodeCount: newCount
      }
    })
  },
  
  addContextNode: (type, position) => {
    set(state => {
      const newCount = state.contextNodeCount + 1
      const id = `context-node-${newCount}`
      const newNode: Node<ContextNodeData> = {
        id,
        type: 'contextNode', 
        position,
        data: {
          id,
          width: 400,
          height: 280,
          isMinimized: false,
          zIndex: 1,
          type,
          content: {},
          projectId: 'current-project' // This should come from context
        }
      }
      
      return {
        nodes: [...state.nodes, newNode],
        contextNodeCount: newCount
      }
    })
  },
  
  updateNode: (id, updates) => {
    set(state => ({
      nodes: state.nodes.map(node => 
        node.id === id ? { ...node, ...updates } : node
      )
    }))
  },
  
  deleteNode: (id) => {
    set(state => ({
      nodes: state.nodes.filter(node => node.id !== id),
      edges: state.edges.filter(edge => edge.source !== id && edge.target !== id)
    }))
  },
  
  addEdge: (edge) => {
    set(state => ({
      edges: [...state.edges, edge]
    }))
  },
  
  deleteEdge: (id) => {
    set(state => ({
      edges: state.edges.filter(edge => edge.id !== id)
    }))
  },
  
  setNodes: (nodes) => {
    set({ nodes })
  },
  
  setEdges: (edges) => {
    set({ edges })
  },
  
  resetCanvas: () => {
    set({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, chatNodeCount: 0, contextNodeCount: 0 })
  },
  
  setViewport: (viewport) => {
    set({ viewport })
  },
  
  hydrate: ({ nodes, edges, viewport }) => {
    // When loading a saved state, we need to correctly set the counters
    // to avoid future ID collisions. We'll parse the highest existing ID number.
    let maxChatId = 0
    let maxContextId = 0
    nodes.forEach(node => {
      if (node.id.startsWith('chat-node-')) {
        const num = parseInt(node.id.split('-')[2], 10)
        if (num > maxChatId) maxChatId = num
      } else if (node.id.startsWith('context-node-')) {
        const num = parseInt(node.id.split('-')[2], 10)
        if (num > maxContextId) maxContextId = num
      }
    })
    
    set({ nodes, edges, viewport, chatNodeCount: maxChatId, contextNodeCount: maxContextId })
  },
  
  onConnect: (connection) => {
    const { nodes } = get()
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    // Validate connection: only context → chat
    if (sourceNode?.type === 'contextNode' && targetNode?.type === 'chatNode') {
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#6366f1',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        }
      }
      
      set(state => ({
        edges: addEdge(newEdge, state.edges)
      }))
    }
  }
}))

