import { supabase, isSupabaseConfigured } from './client'
import { ProjectWithCanvas, PersistedNode, PersistedEdge } from './types'
import { Node, Edge, Viewport } from '@xyflow/react'

// Clean nodes for persistence (remove temporary UI state)
export const cleanNodesForPersistence = (nodes: Node[]): PersistedNode[] => {
  return nodes.map(({ id, type, position, data }) => {
    // Determine context type for context nodes
    const contextType = type === 'contextNode' 
      ? (data.contextType || data.type) as ('ai-chat' | 'video' | 'image' | 'text' | 'website' | 'document')
      : undefined
    
    return {
      id,
      type: type as 'chatNode' | 'contextNode',
      position,
      data: {
        width: typeof data.width === 'number' ? data.width : 400,
        height: typeof data.height === 'number' ? data.height : 280,
        isMinimized: typeof data.isMinimized === 'boolean' ? data.isMinimized : false,
        zIndex: typeof data.zIndex === 'number' ? data.zIndex : 1,
        contextType,
        content: data.content || undefined,
        messages: Array.isArray(data.messages) ? data.messages : undefined
      }
    }
  })
}

// Clean edges for persistence
export const cleanEdgesForPersistence = (edges: Edge[]): PersistedEdge[] => {
  return edges.map(({ id, source, target, sourceHandle, targetHandle, type, animated, style }) => ({
    id,
    source,
    target,
    sourceHandle: sourceHandle || undefined,
    targetHandle: targetHandle || undefined,
    type: (type || 'smoothstep') as 'smoothstep',
    animated: animated || false,
    style: (style || {
      stroke: '#6366f1',
      strokeWidth: 2,
      strokeDasharray: '5,5'
    }) as PersistedEdge['style']
  }))
}

// Create new project
export const createProject = async (name: string, description?: string) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - using local storage')
    return null
  }

  try {
    // 1. Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        viewport: { x: 0, y: 0, zoom: 1 }
      })
      .select()
      .single()

    if (projectError) throw projectError

    // 2. Create empty canvas state
    const { error: canvasError } = await supabase
      .from('canvas_states')
      .insert({
        project_id: project.id,
        nodes: [],
        edges: [],
        version: 1
      })

    if (canvasError) throw canvasError

    return project
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

// Load all projects
export const loadProjects = async (): Promise<ProjectWithCanvas[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - using local storage')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading projects:', error)
    return []
  }
}

// Load single project with canvas
export const loadProjectWithCanvas = async (projectId: string): Promise<ProjectWithCanvas | null> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - using local storage')
    return null
  }

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    const { data: canvasState, error: canvasError } = await supabase
      .from('canvas_states')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (canvasError && canvasError.code !== 'PGRST116') { // PGRST116 = not found
      throw canvasError
    }

    // Update last opened
    await supabase
      .from('projects')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', projectId)

    return {
      ...project,
      canvas_states: canvasState || { nodes: [], edges: [], version: 1 }
    }
  } catch (error) {
    console.error('Error loading project:', error)
    return null
  }
}

// Save canvas state
export const saveCanvasState = async (
  projectId: string,
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport
) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - using local storage')
    return
  }

  try {
    const cleanNodes = cleanNodesForPersistence(nodes)
    const cleanEdges = cleanEdgesForPersistence(edges)

    // Upsert canvas state
    const { error: canvasError } = await supabase
      .from('canvas_states')
      .upsert({
        project_id: projectId,
        nodes: cleanNodes,
        edges: cleanEdges,
        version: 1
      }, {
        onConflict: 'project_id'
      })

    if (canvasError) throw canvasError

    // Update project viewport and timestamp
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        viewport,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (projectError) throw projectError
  } catch (error) {
    console.error('Error saving canvas:', error)
    throw error
  }
}

// Update project details
export const updateProject = async (
  projectId: string,
  updates: { name?: string; description?: string }
) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating project:', error)
    throw error
  }
}

// Delete project
export const deleteProject = async (projectId: string) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured')
    return false
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting project:', error)
    return false
  }
}

// Generate canvas thumbnail (base64)
export const generateCanvasThumbnail = (nodes: Node[]): string | null => {
  // Simple representation - in production, use canvas API
  if (nodes.length === 0) return null
  
  // For now, return a placeholder
  // In production: render mini canvas to base64
  return null
}
