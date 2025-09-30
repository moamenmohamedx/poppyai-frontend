'use client'

/**
 * React Hook for SSE-based Streaming Chat
 * 
 * Provides React state management for token-by-token AI streaming.
 * Wraps the streamChat() function with proper React lifecycle handling.
 * 
 * Features:
 * - Real-time streaming state (isStreaming, streamedText)
 * - Conversation ID tracking
 * - Automatic cleanup on unmount
 * - Cancellation support
 * - Completion callbacks for React Query integration
 * 
 * @module useStreamingChat
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { streamChat, StreamingChatRequest, StreamEventHandlers } from '@/lib/api/streaming'
import { UUID } from '@/types/apiTypes'

/**
 * Options for useStreamingChat hook
 */
export interface UseStreamingChatOptions {
  /**
   * Called when streaming completes successfully
   * Use this to invalidate React Query cache, update UI, etc.
   * 
   * @param fullResponse - Complete AI response text
   * @param conversationId - Conversation UUID (for cache invalidation)
   * @param messageId - Persisted message UUID
   */
  onComplete?: (fullResponse: string, conversationId: UUID, messageId: UUID) => void
  
  /**
   * Called when streaming encounters an error
   * Use this to show error toasts, log errors, etc.
   * 
   * @param error - Error message from backend
   */
  onError?: (error: string) => void
}

/**
 * Hook for managing streaming chat state and lifecycle
 * 
 * Architecture:
 * 1. Maintains React state for streaming status and text
 * 2. Uses refs for cleanup function (prevents stale closures)
 * 3. Provides imperative API (startStreaming, cancelStreaming)
 * 4. Handles cleanup on unmount automatically
 * 
 * @param options - Configuration callbacks
 * @returns Streaming state and control functions
 * 
 * @example
 * ```typescript
 * const {
 *   isStreaming,
 *   streamedText,
 *   currentConversationId,
 *   startStreaming,
 *   cancelStreaming
 * } = useStreamingChat({
 *   onComplete: (text, convId, msgId) => {
 *     queryClient.invalidateQueries(['messages', convId])
 *     toast.success('Response complete')
 *   },
 *   onError: (error) => toast.error(error)
 * })
 * 
 * // Start streaming
 * const handleSend = () => {
 *   startStreaming({
 *     user_message: "Hello",
 *     context_texts: [],
 *     project_id: projectId,
 *     chat_node_id: nodeId,
 *     conversation_id: conversationId
 *   })
 * }
 * 
 * // Cancel streaming
 * const handleCancel = () => {
 *   cancelStreaming()
 * }
 * ```
 */
export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<UUID | undefined>()
  
  // Ref to store cleanup function (prevents stale closure issues)
  const cleanupRef = useRef<(() => void) | null>(null)
  
  // Cleanup on unmount - critical for preventing memory leaks
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        console.log('[useStreamingChat] Cleaning up on unmount')
        cleanupRef.current()
      }
    }
  }, [])
  
  /**
   * Start streaming a chat request
   * 
   * Lifecycle:
   * 1. Reset state (clear previous text, set isStreaming)
   * 2. Set up event handlers
   * 3. Call streamChat() from API layer
   * 4. Store cleanup function in ref
   * 5. Return cleanup function to caller
   * 
   * @param request - Streaming chat request parameters
   * @returns Cleanup function (same as cancelStreaming)
   */
  const startStreaming = useCallback((request: StreamingChatRequest) => {
    // Reset state for new stream
    setStreamedText('')
    setIsStreaming(true)
    
    // Accumulate full response for onComplete callback
    let fullResponse = ''
    let finalMessageId: UUID | undefined
    let finalConversationId: UUID | undefined
    
    // Set up event handlers
    const handlers: StreamEventHandlers = {
      /**
       * Handle each token from the LLM
       * Updates both local accumulator and React state
       */
      onToken: (data) => {
        fullResponse += data.token
        setStreamedText((prev) => prev + data.token)
      },
      
      /**
       * Handle new conversation ID (first message only)
       * Updates React state for immediate use in UI
       */
      onConversationId: (data) => {
        finalConversationId = data.conversation_id
        setCurrentConversationId(data.conversation_id)
      },
      
      /**
       * Handle stream start event
       * Useful for debugging and analytics
       */
      onStreamStart: () => {
        console.log('[useStreamingChat] 🚀 Stream started')
      },
      
      /**
       * Handle stream completion
       * Calls onComplete callback with full response
       * NOTE: We keep streamedText and isStreaming until onComplete callback finishes
       * to avoid UI flash while refetching
       */
      onStreamEnd: async (data) => {
        finalMessageId = data.message_id
        
        // This is the fix: use the conversation ID from the stream if it's a new conversation,
        // otherwise, fall back to the ID passed in the initial request.
        const conversationIdForCallback = finalConversationId || request.conversation_id

        // Call completion callback if all data available
        if (options.onComplete && conversationIdForCallback && finalMessageId) {
          try {
            // Await the onComplete callback to finish (ensures refetch completes)
            // This eliminates race conditions and arbitrary delays
            await options.onComplete(fullResponse, conversationIdForCallback, finalMessageId)

            // Only clear streaming state AFTER callback completes
            setIsStreaming(false)
          } catch (error) {
            console.error('[useStreamingChat] Error in onComplete callback:', error)
            // Still clear streaming state on error
            setIsStreaming(false)
          }
        } else {
          // If no callback, or if conversation ID is missing, just clear immediately
          setIsStreaming(false)
        }
      },
      
      /**
       * Handle stream errors
       * Resets streaming state and calls error callback
       */
      onError: (error) => {
        console.error('[useStreamingChat] ❌ Stream error:', error)
        setIsStreaming(false)
        options.onError?.(error.error)
      },
      
      /**
       * Handle connection close
       * Final cleanup regardless of success/error
       */
      onClose: () => {
        // This was causing a race condition. The isStreaming state is now exclusively
        // managed by onStreamEnd (for success) and onError (for failure) to ensure
        // async operations in onComplete can finish before the UI is updated.
        console.log('[useStreamingChat] ✅ Stream connection closed')
      }
    }
    
    // Start the stream via API layer
    const cleanup = streamChat(request, handlers)
    
    // Store cleanup function for cancellation and unmount
    cleanupRef.current = cleanup
    
    return cleanup
  }, [options])
  
  /**
   * Cancel the current streaming request
   * 
   * Safe to call multiple times or when no stream is active.
   * Clears cleanup ref and resets streaming state.
   */
  const cancelStreaming = useCallback(() => {
    if (cleanupRef.current) {
      console.log('[useStreamingChat] 🛑 Cancelling stream')
      cleanupRef.current()
      cleanupRef.current = null
      setIsStreaming(false)
    }
  }, [])
  
  // Return hook interface
  return {
    /** Whether a stream is currently active */
    isStreaming,
    
    /** Accumulated text from all tokens received so far */
    streamedText,
    
    /** Current conversation ID (from stream or undefined) */
    currentConversationId,
    
    /** Function to start streaming */
    startStreaming,
    
    /** Function to cancel streaming */
    cancelStreaming,
  }
}
