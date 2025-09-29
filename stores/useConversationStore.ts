import { create } from 'zustand'
import { UUID } from '../types/apiTypes'

interface ConversationStore {
  // Core state: map chat node ID to active conversation ID
  activeConversations: { [chatNodeId: string]: UUID }
  
  // Actions (80/20 - only essential operations)
  setActiveConversation: (chatNodeId: string, conversationId: UUID) => void
  getActiveConversation: (chatNodeId: string) => UUID | undefined
  clearConversation: (chatNodeId: string) => void
  clearAllConversations: () => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initialize with empty mapping
  activeConversations: {},
  
  // Set active conversation for a specific chat node
  setActiveConversation: (chatNodeId: string, conversationId: UUID) => {
    set(state => ({
      activeConversations: {
        ...state.activeConversations,
        [chatNodeId]: conversationId
      }
    }))
  },
  
  // Get active conversation for a chat node
  getActiveConversation: (chatNodeId: string) => {
    const { activeConversations } = get()
    return activeConversations[chatNodeId]
  },
  
  // Clear conversation mapping for a chat node
  clearConversation: (chatNodeId: string) => {
    set(state => {
      const { [chatNodeId]: removed, ...rest } = state.activeConversations
      return { activeConversations: rest }
    })
  },
  
  // Clear all conversation mappings (for cleanup/reset)
  clearAllConversations: () => {
    set({ activeConversations: {} })
  }
}))
