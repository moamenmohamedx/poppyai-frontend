import { create } from 'zustand'
import { Node, Edge, addEdge, Connection } from '@xyflow/react'
import { ChatNodeData, ContextNodeData } from '@/types/reactFlowTypes'

export interface ReactFlowStore {
  // State
  nodes: Node[]
  edges: Edge[]
  
  // Node management
  addChatNode: (position?: { x: number; y: number }) => void
  addContextNode: (type: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document', position?: { x: number; y: number }) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  
  // Edge management  
  addEdge: (edge: Edge) => void
  deleteEdge: (id: string) => void
  
  // Utility
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  resetCanvas: () => void
  
  // Connection handling
  onConnect: (connection: Connection) => void
}

let nodeIdCounter = 1

export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  // Initialize with empty arrays - nodes can be added via UI
  nodes: [],
  edges: [],
  
  addChatNode: (position = { x: 250, y: 100 }) => {
    const id = `chat-node-${nodeIdCounter++}`
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
    
    set(state => ({
      nodes: [...state.nodes, newNode]
    }))
  },
  
  addContextNode: (type, position = { x: 100, y: 100 }) => {
    const id = `context-node-${nodeIdCounter++}`
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
    
    set(state => ({
      nodes: [...state.nodes, newNode]
    }))
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
    set({ nodes: [], edges: [] })
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

