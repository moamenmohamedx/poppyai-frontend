// In frontend/types/apiTypes.ts

export type UUID = string;

export interface Message {
  id: UUID;
  conversation_id: UUID;
  role: 'user' | 'ai';
  content: string;
  timestamp: string; // ISO 8601 string
  context_data?: Record<string, any>;
}

export interface Conversation {
  id: UUID;
  project_id: UUID;
  chat_node_id: string;
  title: string;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  messages?: Message[]; // Optionally included
}
