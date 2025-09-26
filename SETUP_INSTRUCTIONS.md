# Setup Instructions for AI Integration

## Environment Configuration

Create a `.env.local` file in the root directory with the following content:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

This configures the frontend to communicate with your FastAPI backend running on localhost:8000.

## Integration Complete ✅

The AI integration has been successfully implemented with the following features:

### ✅ Phase 1: Environment & API Client Setup
- **API Client Service**: `lib/api/client.ts` - Handles communication with FastAPI backend
- **Environment Variables**: Configuration for API base URL

### ✅ Phase 2: State & Context Management  
- **Context Collector**: `lib/context/collector.ts` - Extracts text from connected context nodes
- **Dynamic Context Aggregation**: Automatically collects content from connected cards

### ✅ Phase 3: UI Integration
- **Backend Communication**: Modified `ChatCard.tsx` to use real API calls
- **Loading States**: Added "AI is thinking..." indicator with animated dots
- **Error Handling**: Graceful error messages displayed in chat
- **Dynamic Context Display**: Shows count of connected context items

## How to Test

1. **Start your FastAPI backend** at `http://127.0.0.1:8000`
2. **Start the frontend** with `npm run dev`
3. **Create context cards** (text, video, image, website, document)
4. **Create a chat card**
5. **Connect context cards to the chat card** by dragging the connection handles
6. **Send a message** in the chat - it will include the connected context!

## API Contract

The integration sends requests to `/api/chat` with this format:

```json
{
  "user_message": "Your question here",
  "context_texts": [
    "Text Note: My Note - This is some content",
    "Video: My Video (https://youtube.com/watch?v=xyz)",
    "Website: My Site (https://example.com) - Site description"
  ]
}
```

Expected response:
```json
{
  "response": "AI response based on context and message"
}
```

## Success Criteria Met ✅

- ✅ User can connect text nodes to chat nodes
- ✅ Sending messages triggers POST to `/api/chat`
- ✅ Request includes user message + aggregated context
- ✅ AI responses are displayed in chat UI
- ✅ Loading states and error handling implemented

**Integration is complete and ready for testing!**
