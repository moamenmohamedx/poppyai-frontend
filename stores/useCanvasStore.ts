import { create } from "zustand"

export interface ChatCardPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
}

export interface ContextCardPosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
  type: "ai-chat" | "video" | "image" | "text" | "website" | "document"
  fileId?: string // Reference to the file in the project
  content?: any // Store card-specific content
}

export interface Edge {
  id: string
  sourceId: string
  targetId: string
  sourceType: "chat" | "context"
  targetType: "chat" | "context"
}

interface CanvasStore {
  chatCards: ChatCardPosition[]
  contextCards: ContextCardPosition[]
  edges: Edge[] // Added edges array
  canvasOffset: { x: number; y: number }
  canvasZoom: number
  draggedCard: string | null
  maxZIndex: number
  isConnecting: boolean
  connectionSource: { id: string; type: "chat" | "context" } | null

  addChatCard: (card: ChatCardPosition) => void
  updateChatCard: (id: string, updates: Partial<ChatCardPosition>) => void
  removeChatCard: (id: string) => void
  copyChatCard: (id: string) => void
  addContextCard: (card: ContextCardPosition) => void
  updateContextCard: (id: string, updates: Partial<ContextCardPosition>) => void
  removeContextCard: (id: string) => void
  copyContextCard: (id: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (id: string) => void
  startConnection: (sourceId: string, sourceType: "chat" | "context") => void
  completeConnection: (targetId: string, targetType: "chat" | "context") => void
  cancelConnection: () => void
  setCanvasOffset: (offset: { x: number; y: number }) => void
  setCanvasZoom: (zoom: number) => void
  setDraggedCard: (id: string | null) => void
  bringToFront: (id: string) => void
  resetCanvas: () => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  chatCards: [],
  contextCards: [],
  edges: [], // Initialize edges array
  canvasOffset: { x: 0, y: 0 },
  canvasZoom: 1,
  draggedCard: null,
  maxZIndex: 1,
  isConnecting: false,
  connectionSource: null,

  addChatCard: (card) =>
    set((state) => ({
      chatCards: [
        ...state.chatCards,
        {
          ...card,
          zIndex: state.maxZIndex + 1,
          isMinimized: false, // false = maximized, true = normal size
          width: 400,
          height: 280,
        },
      ],
      maxZIndex: state.maxZIndex + 1,
    })),

  updateChatCard: (id, updates) =>
    set((state) => ({
      chatCards: state.chatCards.map((card) => (card.id === id ? { ...card, ...updates } : card)),
    })),

  removeChatCard: (id) =>
    set((state) => ({
      chatCards: state.chatCards.filter((card) => card.id !== id),
      edges: state.edges.filter((edge) => edge.sourceId !== id && edge.targetId !== id),
    })),

  copyChatCard: (id) =>
    set((state) => {
      const cardToCopy = state.chatCards.find((card) => card.id === id)
      if (!cardToCopy) return state

      const newCard: ChatCardPosition = {
        ...cardToCopy,
        id: `chat-${Date.now()}`,
        x: cardToCopy.x + 20,
        y: cardToCopy.y + 20,
        zIndex: state.maxZIndex + 1,
      }

      return {
        chatCards: [...state.chatCards, newCard],
        maxZIndex: state.maxZIndex + 1,
      }
    }),

  addContextCard: (card) =>
    set((state) => ({
      contextCards: [
        ...state.contextCards,
        {
          ...card,
          zIndex: state.maxZIndex + 1,
          isMinimized: false,
          width: 400, // Standardize to same size as chat cards
          height: 280, // Standardize to same size as chat cards
        },
      ],
      maxZIndex: state.maxZIndex + 1,
    })),

  updateContextCard: (id, updates) =>
    set((state) => ({
      contextCards: state.contextCards.map((card) => (card.id === id ? { ...card, ...updates } : card)),
    })),

  removeContextCard: (id) =>
    set((state) => ({
      contextCards: state.contextCards.filter((card) => card.id !== id),
      edges: state.edges.filter((edge) => edge.sourceId !== id && edge.targetId !== id),
    })),

  copyContextCard: (id) =>
    set((state) => {
      const cardToCopy = state.contextCards.find((card) => card.id === id)
      if (!cardToCopy) return state

      const newCard: ContextCardPosition = {
        ...cardToCopy,
        id: `context-${Date.now()}`,
        x: cardToCopy.x + 20,
        y: cardToCopy.y + 20,
        zIndex: state.maxZIndex + 1,
      }

      return {
        contextCards: [...state.contextCards, newCard],
        maxZIndex: state.maxZIndex + 1,
      }
    }),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  startConnection: (sourceId, sourceType) =>
    set(() => ({
      isConnecting: true,
      connectionSource: { id: sourceId, type: sourceType },
    })),

  completeConnection: (targetId, targetType) =>
    set((state) => {
      if (!state.connectionSource) return state

      // Only allow connections from context cards to chat cards
      const isValidConnection = state.connectionSource.type === "context" && targetType === "chat"

      if (!isValidConnection || state.connectionSource.id === targetId) {
        return {
          isConnecting: false,
          connectionSource: null,
        }
      }

      const existingEdge = state.edges.find(
        (edge) =>
          (edge.sourceId === state.connectionSource!.id && edge.targetId === targetId) ||
          (edge.sourceId === targetId && edge.targetId === state.connectionSource!.id),
      )

      if (existingEdge) {
        return {
          isConnecting: false,
          connectionSource: null,
        }
      }

      const newEdge: Edge = {
        id: `edge-${state.connectionSource.id}-${targetId}-${Date.now()}`,
        sourceId: state.connectionSource.id,
        targetId,
        sourceType: state.connectionSource.type,
        targetType,
      }

      return {
        edges: [...state.edges, newEdge],
        isConnecting: false,
        connectionSource: null,
      }
    }),

  cancelConnection: () =>
    set(() => ({
      isConnecting: false,
      connectionSource: null,
    })),

  setCanvasOffset: (offset) =>
    set(() => ({
      canvasOffset: offset,
    })),

  setCanvasZoom: (zoom) =>
    set(() => ({
      canvasZoom: Math.max(0.25, Math.min(2, zoom)),
    })),

  setDraggedCard: (id) =>
    set(() => ({
      draggedCard: id,
    })),

  bringToFront: (id) =>
    set((state) => {
      const newMaxZIndex = state.maxZIndex + 1
      return {
        chatCards: state.chatCards.map((card) => (card.id === id ? { ...card, zIndex: newMaxZIndex } : card)),
        contextCards: state.contextCards.map((card) => (card.id === id ? { ...card, zIndex: newMaxZIndex } : card)),
        maxZIndex: newMaxZIndex,
      }
    }),

  resetCanvas: () =>
    set(() => ({
      canvasOffset: { x: 0, y: 0 },
      canvasZoom: 1,
    })),
}))
