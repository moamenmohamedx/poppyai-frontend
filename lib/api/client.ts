import { UUID } from '../../types/apiTypes'

export interface ChatRequest {
  user_message: string;
  context_texts: string[];
  project_id: UUID;        // Passed from ChatNode data
  chat_node_id: string;    // The React Flow node ID
  conversation_id?: UUID;  // Can be null/undefined for a new conversation
}

export interface ChatResponse {
  response: string;
  conversation_id: UUID; // Always returns the conversation ID
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000') {
    this.baseUrl = baseUrl;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: request.user_message,
          context_texts: request.context_texts,
          project_id: request.project_id,
          chat_node_id: request.chat_node_id,
          conversation_id: request.conversation_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Client Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to communicate with AI service');
    }
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Health Check Error:', error);
      throw new Error('AI service is unavailable');
    }
  }
}

export const apiClient = new ApiClient();
