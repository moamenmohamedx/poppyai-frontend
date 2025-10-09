"use client"

import { memo, useState, useEffect, useRef } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MessageSquare, X, Plus, Send, Paperclip, Globe, FileText, Image, Copy, Bot, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { useConversationStore } from '@/stores/useConversationStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Conversation, Message, UUID } from '../../types/apiTypes'
import { 
  createConversation, 
  getConversationsForNode, 
  getMessages,
  updateConversation,
  deleteConversation,
  deleteChatNode
} from '../../lib/api/conversations'
import { useStreamingChat } from '@/hooks/useStreamingChat'

interface ChatNodeProps extends NodeProps {
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function ChatNode({ id, data, selected, onNodeContextMenu }: ChatNodeProps) {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // State for conversation rename and delete
  const [renameConversationId, setRenameConversationId] = useState<UUID | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<UUID | null>(null)
  
  const { deleteNode } = useReactFlowStore()
  const conversationStore = useConversationStore()
  const queryClient = useQueryClient()
  
  // Get project ID from node data - STRICT validation, no fallbacks!
  const getProjectId = (): UUID | null => {
    // Primary source: node data (set when node is created)
    if (data?.projectId && String(data.projectId).trim() !== '') {
      return String(data.projectId) as UUID
    }
    
    // Secondary source: project store (backward compatibility)
    const currentProject = useProjectStore.getState().currentProject
    if (currentProject?.id && String(currentProject.id).trim() !== '') {
      console.warn('[ChatNode] Using projectId from store - node data should contain projectId')
      return currentProject.id as UUID
    }
    
    // NO FALLBACK - return null to indicate missing projectId
    console.error('[ChatNode] CRITICAL: No valid projectId found for chat node', { nodeId: id, data })
    return null
  }
  
  const projectId = getProjectId()
  const chatNodeId = typeof id === 'string' ? id : String(id ?? '')
  
  // Get active conversation ID from store with safety check
  const activeConversationId = chatNodeId ? conversationStore.getActiveConversation(chatNodeId) : undefined
  
  // Fetch conversations for this chat node
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', chatNodeId],
    queryFn: () => getConversationsForNode(chatNodeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!chatNodeId,
  })
  
  // Fetch messages for active conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => activeConversationId ? getMessages(activeConversationId) : Promise.resolve([]),
    enabled: !!activeConversationId,
    staleTime: 30 * 1000, // 30 seconds for messages
  })
  
  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: () => {
      // Strict validation
      if (!chatNodeId || chatNodeId.trim() === '') {
        throw new Error('Missing chat node ID for conversation creation')
      }
      if (!projectId || projectId.trim() === '') {
        throw new Error('Missing project ID for conversation creation - node is not linked to a project')
      }
      return createConversation({ project_id: projectId, chat_node_id: chatNodeId })
    },
    onSuccess: (newConversation: Conversation) => {
      conversationStore.setActiveConversation(chatNodeId, newConversation.id)
      queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
      toast.success('New conversation created')
    },
    onError: (error: Error) => {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create conversation')
    }
  })
  
  // Delete chat node mutation
  const deleteChatNodeMutation = useMutation({
    mutationFn: () => deleteChatNode(chatNodeId),
    onSuccess: () => {
      // 1. Remove from React Flow state
      deleteNode(id)
      
      // 2. Remove conversations cache for this node
      queryClient.removeQueries({ queryKey: ['conversations', chatNodeId] })
      
      toast.success('Chat node and all conversations deleted')
    },
    onError: (error: Error) => {
      console.error('Failed to delete chat node:', error)
      toast.error(`Failed to delete: ${error.message}`)
    }
  })
  
  // Rename conversation mutation
  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: UUID; title: string }) =>
      updateConversation(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
      setRenameConversationId(null)
      toast.success('Conversation renamed')
    },
    onError: (error: Error) => {
      console.error('Failed to rename conversation:', error)
      toast.error(`Rename failed: ${error.message}`)
    }
  })

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (id: UUID) => deleteConversation(id),
    onSuccess: () => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })

      // If deleted conversation was active, clear active state
      if (conversationToDelete === activeConversationId) {
        conversationStore.setActiveConversation(chatNodeId, undefined)
        queryClient.removeQueries({ queryKey: ['messages', conversationToDelete] })
      }

      setDeleteConfirmOpen(false)
      setConversationToDelete(null)
      toast.success('Conversation deleted')
    },
    onError: (error: Error) => {
      console.error('Failed to delete conversation:', error)
      toast.error(`Delete failed: ${error.message}`)
    }
  })
  
  // Streaming chat hook - replaces chatMutation
  const {
    isStreaming,
    streamedText,
    currentConversationId: streamConversationId,
    startStreaming,
    cancelStreaming
  } = useStreamingChat({
    onComplete: async (fullResponse, conversationId, messageId) => {
      console.log('🎉 Stream complete, refetching messages...')

      // Refetch messages (invalidates cache and fetches in one operation)
      await queryClient.refetchQueries({ queryKey: ['messages', conversationId] })

      console.log('✅ Messages refetched successfully')

      // Update active conversation if it changed (new conversation created)
      if (conversationId !== activeConversationId) {
        conversationStore.setActiveConversation(chatNodeId, conversationId)
        queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
      }

      toast.success('✅ Response complete')
    },
    onError: (error) => {
      toast.error(`❌ ${error}`)
    }
  })

  // Handler functions - defined before useEffects to avoid dependency issues
  const handleDelete = () => {
    const confirmed = window.confirm(
      'Delete this chat node? All conversations and messages will be permanently deleted.'
    )
    if (confirmed) {
      deleteChatNodeMutation.mutate()
    }
  }
  
  const handleCreateConversation = () => {
    createConversationMutation.mutate()
  }
  
  const handleSelectConversation = (conversationId: UUID) => {
    conversationStore.setActiveConversation(chatNodeId, conversationId)
  }

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
    }
  }, [messages])
  
  // Keyboard handler for delete - MUST be called before any conditional returns
  useEffect(() => {
    if (!selected) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected, handleDelete])
  
  // Early return AFTER all hooks - this is safe
  if (!chatNodeId || !data) {
    return (
      <Card className="w-[700px] h-[700px] bg-white dark:bg-black shadow-lg animate-pulse">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Card>
    )
  }
  
  // Critical validation: projectId must exist
  if (!projectId) {
    return (
      <Card className="w-[700px] h-[700px] bg-red-50 dark:bg-red-900/20 border-2 border-red-500 shadow-lg">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
            Configuration Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-400 mb-4">
            This chat node is not linked to a valid project.
          </p>
          <p className="text-xs text-red-600 dark:text-red-500 mb-4">
            Node ID: {chatNodeId}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteNode(id)}
            className="mt-2"
          >
            Delete Invalid Node
          </Button>
          <p className="text-xs text-red-600 dark:text-red-500 mt-4 max-w-md">
            This usually happens when a node was created before a project was loaded. 
            Please delete this node and create a new one.
          </p>
        </div>
      </Card>
    )
  }

  // Collect context node IDs from connected nodes
  const getConnectedContextNodeIds = (): string[] => {
    const currentNodeId = id
    const nodeIds: string[] = []
    
    // Get fresh data from store
    const { edges } = useReactFlowStore.getState()
    
    // Find edges where this chat node is the target
    const connectedEdges = edges.filter(edge => edge.target === currentNodeId)
    
    // Extract source node IDs
    for (const edge of connectedEdges) {
      nodeIds.push(edge.source)
    }
    
    console.log(`📎 Collected ${nodeIds.length} context node IDs:`, nodeIds)
    return nodeIds
  }

  // Handle sending message with streaming
  const handleSendMessage = async () => {
    // Strict validation - no messages without valid projectId
    if (!message.trim() || isStreaming || !chatNodeId) return
    
    if (!projectId || projectId.trim() === '') {
      toast.error('Cannot send message: No project context', {
        description: 'This node is not properly linked to a project'
      })
      console.error('[ChatNode] Attempted to send message without valid projectId')
      return
    }

    const currentMessage = message
    setMessage('')

    // Get connected context node IDs
    const contextNodeIds = getConnectedContextNodeIds()
    
    // Debug logging
    console.log('🔍 Context collection result:', {
      contextCount: contextNodeIds.length,
      contextNodeIds,
      chatNodeId: id,
      projectId,
      activeConversationId
    })
    
    // Show context status to user
    if (contextNodeIds.length > 0) {
      toast.success(`Using ${contextNodeIds.length} context item${contextNodeIds.length > 1 ? 's' : ''}`, {
        duration: 2000
      })
    }
    
    // OPTIMISTIC UPDATE: Add user message to UI immediately
    if (activeConversationId) {
      const messageQueryKey = ['messages', activeConversationId]
      const optimisticUserMessage: Message = {
        id: crypto.randomUUID() as UUID,
        conversation_id: activeConversationId,
        role: 'user',
        content: currentMessage,
        timestamp: new Date().toISOString(),
      }
      
      // Add optimistic message to cache
      queryClient.setQueryData<Message[]>(messageQueryKey, (old) => [
        ...(old || []),
        optimisticUserMessage
      ])
    }
    
    // Start streaming chat request
    startStreaming({
      user_message: currentMessage,
      context_node_ids: contextNodeIds,
      project_id: projectId,
      chat_node_id: chatNodeId,
      conversation_id: activeConversationId // Can be undefined for new conversations
    })
  }
  
  return (
    <>
      <div 
        className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}
        onContextMenu={onNodeContextMenu}
      >
        {/* Connection handles */}
        <Handle
          id="chat-target"
          type="target"
          position={Position.Left}
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900 dark:handle-glow-purple dark:handle-glow-purple-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
        
        {/* Two-Column Chat Node UI */}
        <Card className="w-[700px] h-[700px] bg-white dark:bg-black shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-gray-200 dark:border-purple-500/30 transition-all overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-purple-100 dark:bg-purple-900/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-purple-300">AI Chat</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded"
              onClick={handleDelete}
            >
              <X className="w-3.5 h-3.5 text-gray-600 dark:text-purple-400" />
            </Button>
          </div>
          
          {/* Two Column Layout */}
          <div className="flex h-[calc(100%-44px)]">
            {/* Left Column: Conversation List */}
            <div className="w-[200px] bg-purple-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col">
              <div className="p-3">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-medium text-sm py-2 rounded-lg shadow-sm"
                  onClick={handleCreateConversation}
                  disabled={createConversationMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {createConversationMutation.isPending ? 'Creating...' : 'New Conversation'}
                </Button>
              </div>
              <div className="px-3 pb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Previous Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {conversationsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Loading conversations...</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 dark:text-gray-500">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div key={conv.id} className="relative group mb-1">
                      {renameConversationId === conv.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => {
                            if (renameValue.trim() && renameValue !== conv.title) {
                              renameMutation.mutate({ id: conv.id, title: renameValue })
                            } else {
                              setRenameConversationId(null)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameValue.trim() && renameValue !== conv.title) {
                              renameMutation.mutate({ id: conv.id, title: renameValue })
                            } else if (e.key === 'Escape') {
                              setRenameConversationId(null)
                            }
                          }}
                          autoFocus
                          className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-purple-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleSelectConversation(conv.id)}
                            className={`flex-1 text-left px-3 py-2 text-sm rounded-lg transition-all ${
                              activeConversationId === conv.id
                                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm font-medium'
                                : 'hover:bg-purple-100/50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                            }`}
                          >
                            {conv.title}
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRenameConversationId(conv.id)
                                  setRenameValue(conv.title)
                                }}
                              >
                                <Edit2 className="w-3 h-3 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConversationToDelete(conv.id)
                                  setDeleteConfirmOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-950 flex flex-col">
              {/* Chat Header */}
              <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">New Conversation</h3>
                  <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-1">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Messages Area */}
              <div ref={messagesEndRef} className="flex-1 p-4 overflow-y-auto">
                {messagesLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="max-w-sm">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Start a new conversation</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Connect context nodes and ask anything!</p>
                      {(() => {
                        const contextCount = getConnectedContextNodeIds().length
                        return contextCount > 0 && (
                          <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              ✓ {contextCount} context item{contextCount > 1 ? 's' : ''} connected
                            </div>
                            <div className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                              Context will be included in your messages
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Existing messages */}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] px-4 py-2 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                          <div className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Streaming message with animated cursor */}
                    {isStreaming && streamedText && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-slate-600">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {streamedText}
                            <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse" />
                          </div>
                          <div className="text-xs opacity-70 mt-1">Streaming...</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Loading state before first token */}
                    {isStreaming && !streamedText && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-slate-600">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-gray-500">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Globe className="w-3.5 h-3.5" />
                    Mindmap
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileText className="w-3.5 h-3.5" />
                    Landing Page
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Globe className="w-3.5 h-3.5" />
                    VSL Page
                  </button>
                </div>
                <div className="flex gap-3 mt-2">
                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">Summarize</button>
                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">Get Key Insights</button>
                </div>
              </div>
              
              {/* Input Area - Simplified */}
              <div className="px-4 pb-4">
                <div className="relative bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                  <div className="flex items-center px-3 py-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask anything or press / for actions"
                      className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && message.trim() && !isStreaming) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5 ml-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        <Image className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />
                      <Button 
                        size="sm" 
                        disabled={!message.trim() && !isStreaming}
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded flex items-center gap-1.5 disabled:opacity-50"
                        onClick={isStreaming ? cancelStreaming : handleSendMessage}
                      >
                        {isStreaming ? (
                          <>
                            <X className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Stop</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Send</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
      </div>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConversationToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => conversationToDelete && deleteConversationMutation.mutate(conversationToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default memo(ChatNode)