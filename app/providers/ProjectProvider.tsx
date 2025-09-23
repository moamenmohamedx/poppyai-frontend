"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { useAutoSaveCanvas } from '@/hooks/useAutoSaveCanvas'
import { loadProjectWithCanvas } from '@/lib/supabase/projects'
import { ProjectWithCanvas } from '@/lib/supabase/types'
import { toast } from 'sonner'

interface ProjectContextValue {
  currentProject: ProjectWithCanvas | null
  setCurrentProject: (project: ProjectWithCanvas | null) => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  isLoading: boolean
  loadProject: (projectId: string) => Promise<void>
  saveNow: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<ProjectWithCanvas | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isLoading, setIsLoading] = useState(false)
  
  const hydrate = useReactFlowStore(state => state.hydrate)
  
  // Auto-save hook
  const { saveNow } = useAutoSaveCanvas({
    projectId: currentProject?.id || null,
    enabled: !!currentProject,
    debounceMs: 2000,
    onSaveStart: () => setSaveStatus('saving'),
    onSaveSuccess: () => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
    onSaveError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  })
  
  // Load project and hydrate canvas
  const loadProject = async (projectId: string) => {
    setIsLoading(true)
    try {
      const projectData = await loadProjectWithCanvas(projectId)
      
      if (projectData) {
        setCurrentProject(projectData)
        
        // Hydrate React Flow store
        hydrate({
          nodes: projectData.canvas_states?.nodes || [],
          edges: projectData.canvas_states?.edges || [],
          viewport: projectData.viewport
        })
        
        toast.success('Project loaded')
      } else {
        toast.error('Project not found')
      }
    } catch (error) {
      console.error('Error loading project:', error)
      toast.error('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Clear project on unmount
  useEffect(() => {
    return () => {
      if (currentProject) {
        saveNow() // Final save before unmounting
      }
    }
  }, [currentProject])
  
  return (
    <ProjectContext.Provider 
      value={{
        currentProject,
        setCurrentProject,
        saveStatus,
        isLoading,
        loadProject,
        saveNow
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider')
  }
  return context
}
