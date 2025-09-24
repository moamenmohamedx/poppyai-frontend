"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import ReactFlowContextLibrary from "./ReactFlowContextLibrary"
import ReactFlowCanvas from "./ReactFlowCanvas"
import { useProjectStore } from "@/stores/useProjectStore"
import { useProjectContext } from "@/app/providers/ProjectProvider"
import { Badge } from "@/components/ui/badge"
import FloatingThemeToggle from "./FloatingThemeToggle"
import { updateProject } from "@/lib/supabase/projects"
import { toast } from "sonner"

interface CanvasProps {
  projectId: string
  onBackToDashboard: () => void
}

export default function Canvas({ projectId, onBackToDashboard }: CanvasProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const originalNameRef = useRef<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { currentProject, loadProject, saveStatus, isLoading, saveNow } = useProjectContext()
  const { updateProject: updateProjectInStore } = useProjectStore()
  
  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId])

  // Click outside handler for name editing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditingName && inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsEditingName(false)
        setEditedName(currentProject?.name || '')
      }
    }
    if (isEditingName) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditingName, currentProject])

  const handleSaveName = useCallback(async () => {
    const trimmedName = editedName.trim()
    
    // Validation
    if (!trimmedName) {
      toast.error('Project name cannot be empty')
      setEditedName(currentProject?.name || '')
      setIsEditingName(false)
      return
    }
    
    if (trimmedName === currentProject?.name) {
      setIsEditingName(false)
      return
    }
    
    // Save the name
    if (currentProject) {
      try {
        // Update in Supabase
        const updatedProject = await updateProject(currentProject.id, { name: trimmedName })
        
        if (updatedProject) {
          // Update local state in store
          updateProjectInStore(currentProject.id, { name: trimmedName })
          
          // Update current project in context
          const updatedCurrentProject = { ...currentProject, name: trimmedName }
          // We need to update the project context - reload the project to ensure sync
          await loadProject(currentProject.id)
          
          toast.success('Project renamed successfully')
        } else {
          throw new Error('Failed to update project')
        }
      } catch (error) {
        console.error('Error renaming project:', error)
        // Rollback on error
        toast.error('Failed to rename project')
        setEditedName(currentProject.name)
      }
    }
    
    setIsEditingName(false)
  }, [editedName, currentProject, updateProjectInStore, loadProject])

  // All legacy canvas logic removed - now using pure React Flow

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-black transition-colors">
      <ReactFlowContextLibrary
        projectId={projectId}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 relative overflow-hidden">
        <header className="bg-white dark:bg-black/80 border-b border-gray-200 dark:border-white/10 px-6 py-4 relative z-10 backdrop-blur-sm transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-purple-300 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              {isEditingName ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveName()
                    } else if (e.key === 'Escape') {
                      setEditedName(currentProject?.name || '')
                      setIsEditingName(false)
                    }
                  }}
                  className="text-lg font-semibold bg-transparent border-b-2 border-indigo-500 dark:border-purple-500 
                             outline-none px-1 dark:text-white min-w-[150px] max-w-[300px]"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  maxLength={50}
                  aria-label="Edit project name"
                />
              ) : (
                <div className="relative group">
                  <h1 
                    className="text-lg font-semibold text-gray-900 dark:bg-gradient-to-r dark:from-purple-500 
                               dark:to-cyan-400 dark:text-transparent dark:bg-clip-text cursor-pointer 
                               hover:opacity-80 transition-opacity select-none"
                    onDoubleClick={() => {
                      setEditedName(currentProject?.name || '')
                      originalNameRef.current = currentProject?.name || ''
                      setIsEditingName(true)
                    }}
                    title="Double-click to rename project"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        setEditedName(currentProject?.name || '')
                        originalNameRef.current = currentProject?.name || ''
                        setIsEditingName(true)
                      }
                    }}
                  >
                    {currentProject?.name || "Untitled Project"}
                  </h1>
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent dark:via-purple-500 opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
              )}
            </div>
            
            {/* Centered save controls - responsive positioning */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-30 
                            hidden sm:flex"> {/* Hidden on mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={saveNow}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-2 dark:border-purple-500/30 dark:hover:bg-purple-500/10 
                           dark:text-purple-300 transition-all duration-200 shadow-sm hover:shadow-md"
                aria-label="Save canvas manually"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>Save</span>
              </Button>
              
              {saveStatus === 'saving' && (
                <Badge variant="secondary" className="animate-pulse dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 transition-all duration-200">
                  Saving...
                </Badge>
              )}
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="text-green-600 border-green-200 dark:text-cyan-400 dark:border-cyan-500/30 transition-all duration-200">
                  Saved
                </Badge>
              )}
              {saveStatus === 'error' && (
                <Badge variant="destructive" className="transition-all duration-200">
                  Save failed
                </Badge>
              )}
              {saveStatus === 'idle' && (
                <span className="text-sm text-gray-600 dark:text-purple-400/70">
                  Auto-save enabled
                </span>
              )}
            </div>
            
            {/* Mobile save button - top right */}
            <div className="flex sm:hidden items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveNow}
                disabled={saveStatus === 'saving'}
                className="dark:border-purple-500/30 dark:hover:bg-purple-500/10"
                aria-label="Save"
              >
                <Save className="w-3 h-3" />
              </Button>
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="text-green-600 border-green-200 dark:text-cyan-400 dark:border-cyan-500/30">
                  ✓
                </Badge>
              )}
            </div>
            
            {/* Right side - empty for balance */}
            <div className="hidden sm:block">
              {/* Placeholder for layout balance */}
            </div>
          </div>
        </header>
        
        <FloatingThemeToggle />

        {/* Pure React Flow Canvas */}
        <div className="absolute inset-0 top-16">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-purple-300">Loading project...</p>
              </div>
            </div>
          ) : (
            <ReactFlowCanvas projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  )
}
