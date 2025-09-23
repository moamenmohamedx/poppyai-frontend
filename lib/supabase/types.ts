// Database types generated from Supabase schema
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          last_opened_at: string | null
          thumbnail: string | null
          viewport: {
            x: number
            y: number
            zoom: number
          }
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          last_opened_at?: string | null
          thumbnail?: string | null
          viewport?: {
            x: number
            y: number
            zoom: number
          }
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          last_opened_at?: string | null
          thumbnail?: string | null
          viewport?: {
            x: number
            y: number
            zoom: number
          }
        }
      }
      canvas_states: {
        Row: {
          project_id: string
          nodes: any[]
          edges: any[]
          version: number
          created_at: string
        }
        Insert: {
          project_id: string
          nodes?: any[]
          edges?: any[]
          version?: number
          created_at?: string
        }
        Update: {
          project_id?: string
          nodes?: any[]
          edges?: any[]
          version?: number
          created_at?: string
        }
      }
    }
  }
}

// Persisted types for React Flow
export interface PersistedNode {
  id: string
  type: 'chatNode' | 'contextNode'
  position: { x: number; y: number }
  data: {
    // Common fields
    width: number
    height: number
    isMinimized: boolean
    zIndex: number
    
    // Context node specific
    contextType?: 'ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document'
    content?: any
    
    // Chat node specific
    messages?: Array<{
      id: string
      type: 'user' | 'ai'
      content: string
      timestamp: string
      citations?: string[]
    }>
  }
}

export interface PersistedEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type: 'smoothstep'
  animated: boolean
  style: {
    stroke: string
    strokeWidth: number
    strokeDasharray?: string
  }
}

export interface ProjectWithCanvas {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  last_opened_at: string | null
  thumbnail: string | null
  viewport: {
    x: number
    y: number
    zoom: number
  }
  canvas_states?: {
    nodes: PersistedNode[]
    edges: PersistedEdge[]
    version: number
  }
}
