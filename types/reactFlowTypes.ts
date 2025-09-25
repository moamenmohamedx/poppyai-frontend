import { Node, Edge } from '@xyflow/react'
import { ChatCardPosition, ContextCardPosition } from '@/stores/useCanvasStore'

// React Flow node data interfaces with index signatures for React Flow compatibility
export interface ChatNodeData extends Omit<ChatCardPosition, 'x' | 'y'> {
  projectId: string
  [key: string]: any // Index signature for React Flow compatibility
}

export interface ContextNodeData extends Omit<ContextCardPosition, 'x' | 'y'> {
  projectId: string
  [key: string]: any // Index signature for React Flow compatibility
}

export interface TextBlockNodeData {
  id: string
  width: number
  height: number
  isMinimized: boolean
  zIndex: number
  primaryText: string
  notesText: string
  projectId: string
  [key: string]: any // Index signature for React Flow compatibility
}

// React Flow node types - use the standard Node type
export type ChatNode = Node<ChatNodeData>
export type ContextNode = Node<ContextNodeData>
export type TextBlockNode = Node<TextBlockNodeData>
export type CanvasNode = ChatNode | ContextNode | TextBlockNode

// React Flow edge type (extends the existing Edge interface)
export interface CanvasEdge extends Edge {
  sourceType: 'chat' | 'context'
  targetType: 'chat' | 'context'
}

// Transformation functions
export const transformChatCardsToNodes = (
  chatCards: ChatCardPosition[], 
  projectId: string
): Node[] => {
  return chatCards.map(card => ({
    id: card.id,
    type: 'chatNode',
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      width: card.width,
      height: card.height,
      isMinimized: card.isMinimized,
      zIndex: card.zIndex,
      projectId
    } as ChatNodeData
  }))
}

export const transformContextCardsToNodes = (
  contextCards: ContextCardPosition[],
  projectId: string  
): Node[] => {
  return contextCards.map(card => ({
    id: card.id,
    type: 'contextNode',
    position: { x: card.x, y: card.y },
    data: {
      id: card.id,
      width: card.width,
      height: card.height,
      isMinimized: card.isMinimized,
      zIndex: card.zIndex,
      type: card.type,
      fileId: card.fileId,
      content: card.content,
      projectId
    } as ContextNodeData
  }))
}

export const transformEdgesToReactFlow = (edges: import('@/stores/useCanvasStore').Edge[]): CanvasEdge[] => {
  return edges.map(edge => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'smoothstep',
    animated: true,
    style: { 
      stroke: '#6366f1', 
      strokeWidth: 2,
      strokeDasharray: '5,5'
    },
    sourceType: edge.sourceType,
    targetType: edge.targetType
  }))
}
