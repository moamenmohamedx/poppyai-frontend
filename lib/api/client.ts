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

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Get token from localStorage (avoiding circular dependency with store)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('printer_auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      // Clear auth state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('printer_auth_token');
        localStorage.removeItem('printer_auth_user');
        // Redirect to login
        window.location.href = '/auth/login';
      }
      throw new Error('Unauthorized - redirecting to login');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          user_message: request.user_message,
          context_texts: request.context_texts,
          project_id: request.project_id,
          chat_node_id: request.chat_node_id,
          conversation_id: request.conversation_id
        }),
      });

      return this.handleResponse<ChatResponse>(response);
    } catch (error) {
      console.error('API Client Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to communicate with AI service');
    }
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return this.handleResponse<{ status: string }>(response);
    } catch (error) {
      console.error('Health Check Error:', error);
      throw new Error('AI service is unavailable');
    }
  }
}

export const apiClient = new ApiClient();
