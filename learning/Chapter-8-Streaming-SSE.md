# Chapter 8: Real-Time Streaming with Server-Sent Events

## Overview

Server-Sent Events (SSE) is a standard for pushing real-time updates from server to client over HTTP. Printer AI uses SSE to stream AI responses token-by-token for a smooth, real-time chat experience.

---

## 1. What are Server-Sent Events?

SSE is a one-way communication channel from server to client:

### SSE vs WebSockets

| Feature | SSE | WebSockets |
|---------|-----|------------|
| Direction | Server → Client | Bidirectional |
| Protocol | HTTP | Custom (ws://) |
| Reconnection | Automatic | Manual |
| Simplicity | Simple | Complex |
| Use Case | Real-time updates, streaming | Chat, games, bidirectional |

**Why SSE for AI Streaming?**
- Simple HTTP connection
- Automatic reconnection
- One-way streaming is perfect for AI responses
- Works with existing HTTP infrastructure

---

## 2. SSE Message Format

SSE messages are plain text with a specific format:

```
event: message
data: {"token": "Hello"}

event: stream_start
data: {"status": "streaming"}

event: stream_end
data: {"message_id": "msg-123", "status": "complete"}
```

**Format Rules:**
- Messages separated by double newline (`\n\n`)
- `event:` line specifies event type (optional, defaults to "message")
- `data:` line contains the payload (usually JSON)
- Multiple `data:` lines are concatenated

---

## 3. Backend SSE Endpoint

### FastAPI Streaming Response

```python
# Backend: backend/canvas_agent/chat/streaming.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

@router.post("/api/chat/stream")
async def stream_chat(request: ChatRequest):
    async def event_generator():
        # Send stream start event
        yield f"event: stream_start\ndata: {json.dumps({'status': 'streaming'})}\n\n"
        
        # Stream tokens from LLM
        async for token in llm_stream(request.user_message):
            yield f"event: message\ndata: {json.dumps({'token': token})}\n\n"
        
        # Send stream end event
        yield f"event: stream_end\ndata: {json.dumps({'message_id': message_id, 'status': 'complete'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

---

## 4. Frontend SSE Client

### Streaming Function

```typescript
// From frontend/lib/api/streaming.ts

export interface StreamingChatRequest {
  user_message: string
  context_node_ids: string[]
  project_id: UUID
  chat_node_id: string
  conversation_id?: UUID
}

export interface StreamEventHandlers {
  onToken?: (data: { token: string }) => void
  onConversationId?: (data: { conversation_id: UUID }) => void
  onStreamStart?: (data: { status: string }) => void
  onStreamEnd?: (data: { message_id: UUID; status: string }) => void
  onError?: (error: { error: string }) => void
  onClose?: () => void
}

export function streamChat(
  request: StreamingChatRequest,
  handlers: StreamEventHandlers
): () => void {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
  
  // Create AbortController for cancellation
  const abortController = new AbortController()
  
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
        signal: abortController.signal,  // Enable cancellation
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Get stream reader
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }
      
      // Decode stream chunks
      const decoder = new TextDecoder()
      let buffer = ''
      
      // Read stream loop
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          handlers.onClose?.()
          break
        }
        
        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true })
        
        // Split by SSE message delimiter
        const messages = buffer.split('\n\n')
        
        // Keep last incomplete message in buffer
        buffer = messages.pop() || ''
        
        // Process each complete message
        for (const message of messages) {
          if (!message.trim()) continue
          
          // Parse SSE format: "event: type\ndata: json"
          const lines = message.split('\n')
          let eventType = 'message'
          let data = ''
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
              data = line.substring(5).trim()
            }
          }
          
          if (!data) continue
          
          // Parse JSON and dispatch
          try {
            const parsed = JSON.parse(data)
            
            switch (eventType) {
              case 'message':
              case 'data':
                if (parsed.token !== undefined) {
                  handlers.onToken?.(parsed)
                }
                break
                
              case 'conversation_id':
                handlers.onConversationId?.(parsed)
                break
                
              case 'stream_start':
                handlers.onStreamStart?.(parsed)
                break
                
              case 'stream_end':
                handlers.onStreamEnd?.(parsed)
                break
                
              case 'error':
                handlers.onError?.(parsed)
                break
            }
          } catch (parseError) {
            console.error('[SSE] JSON parse error:', parseError)
          }
        }
      }
    } catch (error: any) {
      // Don't treat abort as error
      if (error.name === 'AbortError') {
        console.log('[SSE] Stream aborted by user')
        return
      }
      
      handlers.onError?.({ 
        error: error.message || 'Unknown streaming error' 
      })
    }
  }
  
  // Start streaming
  startStreaming()
  
  // Return cleanup function
  return () => {
    abortController.abort()
  }
}
```

---

## 5. React Hook Wrapper

### useStreamingChat Hook

```typescript
// From frontend/hooks/useStreamingChat.ts

export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  // State
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<UUID>()
  
  // Ref for cleanup function
  const cleanupRef = useRef<(() => void) | null>(null)
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])
  
  const startStreaming = useCallback((request: StreamingChatRequest) => {
    // Reset state
    setStreamedText('')
    setIsStreaming(true)
    
    let fullResponse = ''
    let finalMessageId: UUID | undefined
    let finalConversationId: UUID | undefined
    
    // Event handlers
    const handlers: StreamEventHandlers = {
      onToken: (data) => {
        fullResponse += data.token
        setStreamedText((prev) => prev + data.token)
      },
      
      onConversationId: (data) => {
        finalConversationId = data.conversation_id
        setCurrentConversationId(data.conversation_id)
      },
      
      onStreamStart: () => {
        console.log('[useStreamingChat] Stream started')
      },
      
      onStreamEnd: async (data) => {
        finalMessageId = data.message_id
        
        const conversationIdForCallback = finalConversationId || request.conversation_id
        
        // Call completion callback
        if (options.onComplete && conversationIdForCallback && finalMessageId) {
          await options.onComplete(fullResponse, conversationIdForCallback, finalMessageId)
        }
        
        setIsStreaming(false)
      },
      
      onError: (error) => {
        console.error('[useStreamingChat] Stream error:', error)
        setIsStreaming(false)
        options.onError?.(error.error)
      },
      
      onClose: () => {
        console.log('[useStreamingChat] Stream closed')
      }
    }
    
    // Start stream
    const cleanup = streamChat(request, handlers)
    cleanupRef.current = cleanup
    
    return cleanup
  }, [options])
  
  const cancelStreaming = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
      setIsStreaming(false)
    }
  }, [])
  
  return {
    isStreaming,
    streamedText,
    currentConversationId,
    startStreaming,
    cancelStreaming,
  }
}
```

---

## 6. Using the Streaming Hook

### In ChatNode Component

```typescript
// From frontend/components/nodes/ChatNode.tsx

function ChatNode() {
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()
  
  // Use streaming hook
  const {
    isStreaming,
    streamedText,
    startStreaming,
    cancelStreaming
  } = useStreamingChat({
    onComplete: async (fullResponse, conversationId, messageId) => {
      console.log('Stream complete, refetching messages...')
      
      // Refetch messages to get persisted data
      await queryClient.refetchQueries({
        queryKey: ['messages', conversationId]
      })
      
      // Update active conversation if it changed
      if (conversationId !== activeConversationId) {
        conversationStore.setActiveConversation(chatNodeId, conversationId)
        queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
      }
      
      toast.success('Response complete')
    },
    onError: (error) => {
      toast.error(`Error: ${error}`)
    }
  })
  
  const handleSendMessage = async () => {
    const contextNodeIds = getConnectedContextNodeIds()
    
    // Optimistic update: Add user message immediately
    if (activeConversationId) {
      const optimisticMessage: Message = {
        id: crypto.randomUUID() as UUID,
        conversation_id: activeConversationId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      
      queryClient.setQueryData<Message[]>(
        ['messages', activeConversationId],
        (old) => [...(old || []), optimisticMessage]
      )
    }
    
    // Start streaming
    startStreaming({
      user_message: message,
      context_node_ids: contextNodeIds,
      project_id: projectId,
      chat_node_id: chatNodeId,
      conversation_id: activeConversationId
    })
    
    setMessage('')
  }
  
  return (
    <div>
      {/* Messages */}
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      
      {/* Streaming message with cursor */}
      {isStreaming && streamedText && (
        <div>
          {streamedText}
          <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse" />
        </div>
      )}
      
      {/* Loading state before first token */}
      {isStreaming && !streamedText && (
        <div>AI is thinking...</div>
      )}
      
      {/* Input */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isStreaming) {
            handleSendMessage()
          }
        }}
      />
      
      <Button
        onClick={isStreaming ? cancelStreaming : handleSendMessage}
        disabled={!message.trim() && !isStreaming}
      >
        {isStreaming ? 'Stop' : 'Send'}
      </Button>
    </div>
  )
}
```

---

## 7. Stream Lifecycle

### Complete Flow

```
1. User sends message
   ↓
2. Optimistic update (add user message to UI)
   ↓
3. Start streaming
   ↓
4. Backend receives request
   ↓
5. stream_start event → onStreamStart()
   ↓
6. conversation_id event (if new) → onConversationId()
   ↓
7. Token events (many) → onToken()
   ├─ Accumulate in fullResponse
   └─ Update streamedText state → UI updates
   ↓
8. stream_end event → onStreamEnd()
   ├─ Call onComplete callback
   ├─ Refetch messages from server
   └─ Set isStreaming = false
   ↓
9. Connection closes → onClose()
```

---

## 8. Event Types

### Event Handlers

```typescript
interface StreamEventHandlers {
  // Token received from LLM
  onToken?: (data: { token: string }) => void
  
  // New conversation created (first message only)
  onConversationId?: (data: { conversation_id: UUID }) => void
  
  // Stream started (after connection established)
  onStreamStart?: (data: { status: 'streaming' }) => void
  
  // Stream completed successfully
  onStreamEnd?: (data: { message_id: UUID; status: 'complete' }) => void
  
  // Error occurred
  onError?: (error: { error: string }) => void
  
  // Connection closed (success or cancel)
  onClose?: () => void
}
```

---

## 9. Cancellation Support

### AbortController Pattern

```typescript
// Create controller
const abortController = new AbortController()

// Pass signal to fetch
fetch(url, {
  signal: abortController.signal
})

// Cancel the request
abortController.abort()

// Handle cancellation
catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled - not an error
    return
  }
  // Real error
  handleError(error)
}
```

### In UI

```typescript
<Button
  onClick={isStreaming ? cancelStreaming : handleSendMessage}
>
  {isStreaming ? (
    <>
      <X className="w-4 h-4" />
      Stop
    </>
  ) : (
    <>
      <Send className="w-4 h-4" />
      Send
    </>
  )}
</Button>
```

---

## 10. Error Handling

### Network Errors

```typescript
try {
  const response = await fetch(url, { ... })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
} catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled
    return
  }
  
  if (error.message.includes('Failed to fetch')) {
    // Network error
    handlers.onError?.({ error: 'Network connection failed' })
  } else {
    // Other errors
    handlers.onError?.({ error: error.message })
  }
}
```

### Backend Errors

```typescript
// Backend sends error event
yield f"event: error\ndata: {json.dumps({'error': 'Rate limit exceeded'})}\n\n"

// Frontend handles it
case 'error':
  handlers.onError?.(parsed)  // { error: 'Rate limit exceeded' }
  break
```

---

## 11. Buffer Management

### Why Buffering?

Chunks don't always arrive at message boundaries:

```typescript
// Chunk 1: "event: message\ndata: {\"tok"
// Chunk 2: "en\": \"Hello\"}\n\n"
// Need to buffer and wait for "\n\n"
```

### Buffer Pattern

```typescript
let buffer = ''

while (true) {
  const { value } = await reader.read()
  buffer += decoder.decode(value, { stream: true })
  
  // Split by message delimiter
  const messages = buffer.split('\n\n')
  
  // Keep last incomplete part
  buffer = messages.pop() || ''
  
  // Process complete messages
  for (const message of messages) {
    processMessage(message)
  }
}
```

---

## 12. Integration with React Query

### Coordinating Streaming and Caching

```typescript
const { startStreaming } = useStreamingChat({
  onComplete: async (fullResponse, conversationId, messageId) => {
    // 1. Refetch messages (gets persisted data with real IDs)
    await queryClient.refetchQueries({
      queryKey: ['messages', conversationId]
    })
    
    // 2. Update conversation list if needed
    if (conversationId !== activeConversationId) {
      conversationStore.setActiveConversation(chatNodeId, conversationId)
      queryClient.invalidateQueries({ queryKey: ['conversations', chatNodeId] })
    }
  }
})
```

**Flow:**
1. Streaming shows real-time tokens
2. On complete, refetch from server
3. React Query replaces optimistic data with real data
4. UI updates seamlessly (no flicker)

---

## 13. UI States

### Three States to Handle

```typescript
{/* 1. Loading: Before first token */}
{isStreaming && !streamedText && (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
    <span className="text-sm text-gray-500">AI is thinking...</span>
  </div>
)}

{/* 2. Streaming: Tokens arriving */}
{isStreaming && streamedText && (
  <div>
    {streamedText}
    <span className="inline-block w-2 h-4 ml-1 bg-purple-600 animate-pulse" />
  </div>
)}

{/* 3. Complete: All messages loaded */}
{!isStreaming && messages.map((msg) => (
  <div key={msg.id}>{msg.content}</div>
))}
```

---

## 14. Reconnection Strategy

SSE has automatic reconnection, but you can enhance it:

```typescript
let retryCount = 0
const maxRetries = 3

const startStreamingWithRetry = async () => {
  try {
    await startStreaming(request)
    retryCount = 0  // Reset on success
  } catch (error) {
    if (error.name === 'AbortError') {
      return  // User cancelled
    }
    
    retryCount++
    if (retryCount < maxRetries) {
      console.log(`Retrying... (${retryCount}/${maxRetries})`)
      setTimeout(() => startStreamingWithRetry(), 1000 * retryCount)
    } else {
      toast.error('Connection failed after multiple retries')
    }
  }
}
```

---

## 15. Performance Considerations

### Token Batching

For very fast streams, batch tokens:

```typescript
let tokenBuffer = ''
let batchTimer: NodeJS.Timeout | null = null

onToken: (data) => {
  tokenBuffer += data.token
  
  if (batchTimer) clearTimeout(batchTimer)
  
  batchTimer = setTimeout(() => {
    setStreamedText((prev) => prev + tokenBuffer)
    tokenBuffer = ''
  }, 16)  // ~60fps
}
```

### Prevent Re-renders

```typescript
// Use functional update to avoid re-renders
setStreamedText((prev) => prev + token)  // ✅ Good

// Don't use current state in dependency
setStreamedText(streamedText + token)  // ❌ Bad (re-creates callback)
```

---

## Key Takeaways

1. **SSE**: One-way streaming from server to client
2. **Event Format**: `event: type\ndata: json\n\n`
3. **ReadableStream**: Browser API for streaming responses
4. **Buffer Management**: Handle incomplete chunks
5. **AbortController**: Enable cancellation
6. **React Hook**: Wrap streaming logic with lifecycle management
7. **Event Handlers**: onToken, onStreamStart, onStreamEnd, onError
8. **Cleanup**: Always clean up on unmount
9. **React Query Integration**: Refetch after streaming completes
10. **UI States**: Loading, streaming, complete

---

## Best Practices

1. **Always cleanup** - Store cleanup function in ref
2. **Handle cancellation** - Don't treat AbortError as error
3. **Buffer properly** - Wait for complete messages
4. **Functional updates** - Use `(prev) => prev + token`
5. **Error feedback** - Show user-friendly error messages
6. **Loading states** - Show before first token
7. **Cursor animation** - Visual indicator during streaming
8. **Disable input** - Prevent multiple simultaneous streams
9. **Refetch on complete** - Sync with server data
10. **Type everything** - Strong types for events and handlers

---

## Next Steps

Now you understand:
- How SSE enables real-time streaming
- Complete streaming lifecycle
- Integration with React and React Query
- Error handling and cancellation
- UI patterns for streaming states

Streaming creates the magic - real-time responses make the AI feel alive!

