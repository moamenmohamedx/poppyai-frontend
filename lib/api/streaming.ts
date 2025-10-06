/**
 * Server-Sent Events (SSE) Streaming Client for AI Chat
 * 
 * Implements token-by-token streaming for real-time AI responses.
 * Follows SSE RFC 8895 specification with proper event parsing.
 * 
 * @module streaming
 */

import { UUID } from '../../types/apiTypes'

/**
 * Request payload for streaming chat endpoint
 * Matches backend ChatRequest model exactly
 */
export interface StreamingChatRequest {
  user_message: string
  context_node_ids: string[]
  project_id: UUID
  chat_node_id: string
  conversation_id?: UUID
}

/**
 * SSE Event Data Types
 * Each event type corresponds to a specific backend event
 */

/** Token event - contains a single text chunk from the LLM */
export interface StreamToken {
  token: string
}

/** Conversation ID event - sent when a new conversation is created */
export interface StreamConversationId {
  conversation_id: UUID
}

/** Stream start event - signals beginning of token stream */
export interface StreamStart {
  status: 'streaming'
}

/** Stream end event - signals completion with persisted message ID */
export interface StreamEnd {
  message_id: UUID
  status: 'complete'
}

/** Error event - contains error message */
export interface StreamError {
  error: string
}

/**
 * Event handler callbacks for SSE lifecycle
 * All handlers are optional for flexible usage
 */
export type StreamEventHandlers = {
  /** Called for each token received from the LLM */
  onToken?: (data: StreamToken) => void
  
  /** Called when a new conversation is created (only for first message) */
  onConversationId?: (data: StreamConversationId) => void
  
  /** Called when streaming begins (after connection established) */
  onStreamStart?: (data: StreamStart) => void
  
  /** Called when streaming completes successfully */
  onStreamEnd?: (data: StreamEnd) => void
  
  /** Called on any error during streaming */
  onError?: (error: StreamError) => void
  
  /** Called when the connection closes (success or abort) */
  onClose?: () => void
}

/**
 * Initiates a streaming chat request using Server-Sent Events
 * 
 * Architecture:
 * 1. Sends POST request to /api/chat/stream
 * 2. Reads response body as stream using ReadableStream API
 * 3. Parses SSE format (event: type\ndata: json\n\n)
 * 4. Invokes appropriate handlers for each event
 * 5. Supports cancellation via returned cleanup function
 * 
 * @param request - Chat request parameters
 * @param handlers - Event handler callbacks
 * @returns Cleanup function that aborts the stream
 * 
 * @example
 * ```typescript
 * const cleanup = streamChat(
 *   {
 *     user_message: "Hello",
 *     context_texts: [],
 *     project_id: "...",
 *     chat_node_id: "node-1"
 *   },
 *   {
 *     onToken: (data) => console.log(data.token),
 *     onStreamEnd: (data) => console.log("Complete:", data.message_id),
 *     onError: (error) => console.error(error.error)
 *   }
 * )
 * 
 * // Later, to cancel:
 * cleanup()
 * ```
 */
export function streamChat(
  request: StreamingChatRequest,
  handlers: StreamEventHandlers
): () => void {
  // Get base URL from environment with fallback
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
  
  // Create abort controller for cancellation support
  const abortController = new AbortController()
  
  /**
   * Async function that manages the streaming connection
   * Runs immediately and handles the entire SSE lifecycle
   */
  const startStreaming = async () => {
    try {
      // Get auth token
      const token = localStorage.getItem('printer_auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Initiate streaming request
      const response = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: abortController.signal, // Enable cancellation
      })
      
      // Validate response
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Get stream reader from response body
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }
      
      // Text decoder for converting Uint8Array to string
      const decoder = new TextDecoder()
      
      // Buffer for incomplete SSE messages
      let buffer = ''
      
      // Read stream loop
      while (true) {
        const { done, value } = await reader.read()
        
        // Stream complete
        if (done) {
          handlers.onClose?.()
          break
        }
        
        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true })
        
        // Split by SSE message delimiter (\n\n)
        const messages = buffer.split('\n\n')
        
        // Keep last incomplete message in buffer
        buffer = messages.pop() || ''
        
        // Process each complete message
        for (const message of messages) {
          if (!message.trim()) continue
          
          // Parse SSE format: "event: type\ndata: json"
          const lines = message.split('\n')
          let eventType = 'message' // Default event type
          let data = ''
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
              data = line.substring(5).trim()
            }
          }
          
          // Skip messages without data
          if (!data) continue
          
          // Parse JSON data and dispatch to handlers
          try {
            const parsed = JSON.parse(data)
            
            switch (eventType) {
              case 'message':
              case 'data':
                // Default event type for tokens
                if (parsed.token !== undefined) {
                  handlers.onToken?.(parsed as StreamToken)
                }
                break
                
              case 'conversation_id':
                handlers.onConversationId?.(parsed as StreamConversationId)
                break
                
              case 'stream_start':
                handlers.onStreamStart?.(parsed as StreamStart)
                break
                
              case 'stream_end':
                handlers.onStreamEnd?.(parsed as StreamEnd)
                break
                
              case 'error':
                handlers.onError?.(parsed as StreamError)
                break
                
              default:
                // Unknown event type - log for debugging
                console.warn(`[SSE] Unknown event type: ${eventType}`, parsed)
            }
          } catch (parseError) {
            console.error('[SSE] JSON parse error:', parseError, 'Data:', data)
          }
        }
      }
    } catch (error: any) {
      // Don't treat abort as error (user-initiated cancellation)
      if (error.name === 'AbortError') {
        console.log('[SSE] Stream aborted by user')
        return
      }
      
      // All other errors are real errors
      console.error('[SSE] Stream error:', error)
      handlers.onError?.({ 
        error: error.message || 'Unknown streaming error' 
      })
    }
  }
  
  // Start streaming immediately
  startStreaming()
  
  // Return cleanup function for cancellation
  return () => {
    console.log('[SSE] Aborting stream...')
    abortController.abort()
  }
}
