import { create } from 'zustand'
import { Node, Edge, addEdge, Connection, Viewport } from '@xyflow/react'
import { ChatNodeData, ContextNodeData, TextBlockNodeData } from '@/types/reactFlowTypes'
import { toast } from 'sonner'

export interface ReactFlowStore {
  // State
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  
  // Node management
  addChatNode: (position: { x: number; y: number }) => void
  addContextNode: (type: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document', position: { x: number; y: number }) => void
  addTextBlockNode: (position: { x: number; y: number }) => void
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

  // Clipboard functionality
  copiedNodes: Node[]
  copiedEdges: Edge[]
  copyNodes: (nodes: Node[]) => void
  pasteNodes: (position: { x: number, y: number }) => void
  deleteSelectedNodes: () => void

  // Internal counters
  chatNodeCount: number
  contextNodeCount: number
  textBlockNodeCount: number
}

export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  // Initialize with empty arrays - nodes can be added via UI
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  chatNodeCount: 0,
  contextNodeCount: 0,
  textBlockNodeCount: 0,
  copiedNodes: [],
  copiedEdges: [],
  
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
  
  addTextBlockNode: (position) => {
    set(state => {
      const newCount = state.textBlockNodeCount + 1
      const id = `text-block-node-${newCount}`
      const newNode: Node<TextBlockNodeData> = {
        id,
        type: 'textBlockNode',
        position,
        data: {
          id,
          width: 400,
          height: 320,
          isMinimized: false,
          zIndex: 1,
          primaryText: '',
          notesText: '',
          projectId: 'current-project' // This should come from context
        }
      }
      
      return {
        nodes: [...state.nodes, newNode],
        textBlockNodeCount: newCount
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
    set({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, chatNodeCount: 0, contextNodeCount: 0, textBlockNodeCount: 0 })
  },
  
  setViewport: (viewport) => {
    set({ viewport })
  },
  
  hydrate: ({ nodes, edges, viewport }) => {
    // When loading a saved state, we need to correctly set the counters
    // to avoid future ID collisions. We'll parse the highest existing ID number.
    let maxChatId = 0
    let maxContextId = 0
    let maxTextBlockId = 0
    nodes.forEach(node => {
      if (node.id.startsWith('chat-node-')) {
        const num = parseInt(node.id.split('-')[2], 10)
        if (num > maxChatId) maxChatId = num
      } else if (node.id.startsWith('context-node-')) {
        const num = parseInt(node.id.split('-')[2], 10)
        if (num > maxContextId) maxContextId = num
      } else if (node.id.startsWith('text-block-node-')) {
        const num = parseInt(node.id.split('-')[3], 10)
        if (num > maxTextBlockId) maxTextBlockId = num
      }
    })
    
    set({ nodes, edges, viewport, chatNodeCount: maxChatId, contextNodeCount: maxContextId, textBlockNodeCount: maxTextBlockId })
  },
  
  onConnect: (connection) => {
    const { nodes } = get()
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    // Validate connection: only context → chat or textBlock → chat
    if ((sourceNode?.type === 'contextNode' || sourceNode?.type === 'textBlockNode') && targetNode?.type === 'chatNode') {
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
  },

  copyNodes: (nodesToCopy) => {
    const { edges } = get()
    
    // Find all edges between the selected nodes
    const nodeIds = nodesToCopy.map(n => n.id)
    const edgesToCopy = edges.filter(edge => 
      nodeIds.includes(edge.source) && nodeIds.includes(edge.target)
    )
    
    set({ 
      copiedNodes: nodesToCopy,
      copiedEdges: edgesToCopy
    })
    
    toast.success("Copied web content", { 
      duration: 3000,
      position: 'top-center'
    })
  },

  pasteNodes: (position) => {
    const { copiedNodes, copiedEdges, chatNodeCount, contextNodeCount } = get()
    
    if (copiedNodes.length === 0) return
    
    // Calculate offset from first copied node
    const firstNode = copiedNodes[0]
    const offsetX = position.x - firstNode.position.x
    const offsetY = position.y - firstNode.position.y
    
    // Create new nodes with new IDs and positions
    const idMap: Record<string, string> = {}
    let newChatCount = chatNodeCount
    let newContextCount = contextNodeCount
    
    const newNodes = copiedNodes.map(node => {
      let newId: string
      
      if (node.type === 'chatNode') {
        newChatCount++
        newId = `chat-node-${newChatCount}`
      } else if (node.type === 'contextNode') {
        newContextCount++
        newId = `context-node-${newContextCount}`
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
        selected: false,
        data: {
          ...node.data,
          id: newId
        }
      }
    })
    
    // Create new edges with mapped IDs
    const newEdges = copiedEdges.map(edge => ({
      ...edge,
      id: `edge-${idMap[edge.source]}-${idMap[edge.target]}`,
      source: idMap[edge.source],
      target: idMap[edge.target]
    }))
    
    set(state => ({
      nodes: [...state.nodes, ...newNodes],
      edges: [...state.edges, ...newEdges],
      chatNodeCount: newChatCount,
      contextNodeCount: newContextCount
    }))
    
    toast.success("Pasted web content", { 
      duration: 3000,
      position: 'top-center'
    })
  },

  deleteSelectedNodes: () => {
    const { nodes, edges } = get()
    const selectedNodes = nodes.filter(node => node.selected)
    
    if (selectedNodes.length === 0) return
    
    const selectedNodeIds = selectedNodes.map(n => n.id)
    
    set(state => ({
      nodes: state.nodes.filter(node => !selectedNodeIds.includes(node.id)),
      edges: state.edges.filter(edge => 
        !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
      )
    }))
    
    toast.success(`Deleted ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`, {
      duration: 3000,
      position: 'top-center'
    })
  }
}))

