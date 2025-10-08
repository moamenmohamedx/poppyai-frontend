import { create } from 'zustand'
import { Node, Edge, addEdge, Connection, Viewport } from '@xyflow/react'
import { ChatNodeData, ContextNodeData, TextBlockNodeData, GoogleContextNode } from '@/types/reactFlowTypes'
import { GoogleContextNodeData } from '@/types/googleTypes'
import { toast } from 'sonner'

export interface ReactFlowStore {
  // State
  nodes: Node[]
  edges: Edge[]
  viewport: Viewport
  
  // Node management
  addChatNode: (position: { x: number; y: number }, projectId: string) => void
  addContextNode: (type: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document', position: { x: number; y: number }, projectId: string) => void
  addTextBlockNode: (position: { x: number; y: number }, projectId: string) => void
  addGoogleContextNode: (position: { x: number; y: number }, projectId: string) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => Promise<void>
  
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
  deleteSelectedNodes: () => Promise<void>

  // Internal counters
  chatNodeCount: number
  contextNodeCount: number
  textBlockNodeCount: number
  googleContextNodeCount: number
}

export const useReactFlowStore = create<ReactFlowStore>((set, get) => ({
  // Initialize with empty arrays - nodes can be added via UI
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  chatNodeCount: 0,
  contextNodeCount: 0,
  textBlockNodeCount: 0,
  googleContextNodeCount: 0,
  copiedNodes: [],
  copiedEdges: [],
  
  addChatNode: (position, projectId) => {
    // Validate projectId is provided
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot create node: No active project', {
        description: 'Please ensure a project is loaded first'
      })
      console.error('[useReactFlowStore] addChatNode called without valid projectId')
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
          projectId: projectId  // Use provided projectId - no fallback!
        }
      }
      
      console.log(`[useReactFlowStore] Created chat node ${id} for project ${projectId}`)
      
      return {
        nodes: [...state.nodes, newNode],
        chatNodeCount: newCount
      }
    })
  },
  
  addContextNode: (type, position, projectId) => {
    // Validate projectId is provided
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot create node: No active project', {
        description: 'Please ensure a project is loaded first'
      })
      console.error('[useReactFlowStore] addContextNode called without valid projectId')
      return
    }
    
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
          projectId: projectId  // Use provided projectId - no fallback!
        }
      }
      
      console.log(`[useReactFlowStore] Created context node ${id} for project ${projectId}`)
      
      return {
        nodes: [...state.nodes, newNode],
        contextNodeCount: newCount
      }
    })
  },
  
  addTextBlockNode: (position, projectId) => {
    // Validate projectId is provided
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot create node: No active project', {
        description: 'Please ensure a project is loaded first'
      })
      console.error('[useReactFlowStore] addTextBlockNode called without valid projectId')
      return
    }
    
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
          projectId: projectId  // Use provided projectId - no fallback!
        }
      }
      
      console.log(`[useReactFlowStore] Created text block node ${id} for project ${projectId}`)
      
      return {
        nodes: [...state.nodes, newNode],
        textBlockNodeCount: newCount
      }
    })
  },

  addGoogleContextNode: (position, projectId) => {
    // Validate projectId is provided
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot create node: No active project', {
        description: 'Please ensure a project is loaded first'
      })
      console.error('[useReactFlowStore] addGoogleContextNode called without valid projectId')
      return
    }

    set(state => {
      const newCount = state.googleContextNodeCount + 1
      const id = `google-context-${Date.now()}`
      const newNode: GoogleContextNode = {
        id,
        type: 'googleContextNode',
        position,
        data: {
          // OAuth-based fields
          documentId: undefined,
          mimeType: undefined,
          content: undefined,

          // Common fields
          documentType: null,
          documentTitle: null,
          selectedSheet: null,
          availableSheets: [],
          lastFetched: null,
          error: null,
          isLoading: false,
          isFetchingDocuments: false,
          projectId: projectId, // CRITICAL: Assign projectId to the node data
        }
      }

      console.log(`[useReactFlowStore] Created Google context node ${id} for project ${projectId}`)

      return {
        nodes: [...state.nodes, newNode],
        googleContextNodeCount: newCount
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
  
  deleteNode: async (id) => {
    const state = get()
    const nodeToDelete = state.nodes.find(node => node.id === id)
    
    // If it's a chat node, call backend API to delete conversations and messages
    if (nodeToDelete?.type === 'chatNode') {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
      
      try {
        const response = await fetch(`${backendUrl}/api/chat-nodes/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`✅ Backend cleanup: ${result.deleted_conversations} conversations and ${result.deleted_messages} messages deleted`)
        } else {
          console.warn('Backend cleanup failed for chat node, but continuing with node deletion')
        }
      } catch (backendError) {
        // Log but don't fail - backend might be offline
        console.warn('Backend API unavailable for chat node cleanup:', backendError)
      }
      
      // ⚠️ CRITICAL: Clear frontend caches for this chat node
      // This prevents showing stale messages when creating new nodes
      try {
        // Import conversation store dynamically to avoid circular dependencies
        const { useConversationStore } = await import('./useConversationStore')
        
        // Clear conversation store mapping
        useConversationStore.getState().clearConversation(id)
        console.log(`✅ Cleared conversation store for chat node: ${id}`)
        
        // Clear React Query cache (if queryClient is available globally)
        if (typeof window !== 'undefined' && (window as any).queryClient) {
          const queryClient = (window as any).queryClient
          
          // Remove all queries related to this chat node
          queryClient.removeQueries({ queryKey: ['conversations', id] })
          queryClient.removeQueries({ queryKey: ['messages'] }) // Clear all message caches to be safe
          
          console.log(`✅ Cleared React Query cache for chat node: ${id}`)
        }
      } catch (cleanupError) {
        console.warn('Frontend cache cleanup failed:', cleanupError)
      }
    }
    
    // Remove node and connected edges from canvas
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
    set({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 }, chatNodeCount: 0, contextNodeCount: 0, textBlockNodeCount: 0, googleContextNodeCount: 0 })
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
    
    // Track Google context nodes
    let maxGoogleContextId = 0
    nodes.forEach(node => {
      if (node.type === 'googleContextNode') {
        const timestamp = parseInt(node.id.split('-')[2], 10)
        if (timestamp > maxGoogleContextId) maxGoogleContextId = timestamp
      }
    })
    
    set({ nodes, edges, viewport, chatNodeCount: maxChatId, contextNodeCount: maxContextId, textBlockNodeCount: maxTextBlockId, googleContextNodeCount: maxGoogleContextId })
  },
  
  onConnect: (connection) => {
    const { nodes } = get()
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    // Validate connection: only context → chat or textBlock → chat or googleContext → chat
    if ((sourceNode?.type === 'contextNode' || sourceNode?.type === 'textBlockNode' || sourceNode?.type === 'googleContextNode') && targetNode?.type === 'chatNode') {
      // Determine handle IDs based on node types
      const sourceHandle = sourceNode?.type === 'textBlockNode' ? 'text-source' : sourceNode?.type === 'googleContextNode' ? 'google-source' : 'context-source'
      const targetHandle = 'chat-target'
      
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#a855f7',
          strokeWidth: 3,
          strokeDasharray: '5,5'
        },
        className: 'dark:stroke-purple-500'
      }
      
      console.log('🔗 Store creating edge:', newEdge)
      
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

  deleteSelectedNodes: async () => {
    const { nodes, deleteNode } = get()
    const selectedNodes = nodes.filter(node => node.selected)
    
    if (selectedNodes.length === 0) return
    
    // Delete each node individually to ensure backend cleanup for chat nodes
    for (const node of selectedNodes) {
      await deleteNode(node.id)
    }
    
    toast.success(`Deleted ${selectedNodes.length} node${selectedNodes.length > 1 ? 's' : ''}`, {
      duration: 3000,
      position: 'top-center'
    })
  }
}))

