"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import ReactFlowContextLibrary from "./ReactFlowContextLibrary"
import ReactFlowCanvas from "./ReactFlowCanvas"
import { useProjectStore } from "@/stores/useProjectStore"
import { useProjectContext } from "@/app/providers/ProjectProvider"
import { Badge } from "@/components/ui/badge"
import FloatingThemeToggle from "./FloatingThemeToggle"

interface CanvasProps {
  projectId: string
  onBackToDashboard: () => void
}

export default function Canvas({ projectId, onBackToDashboard }: CanvasProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { currentProject, loadProject, saveStatus, isLoading, saveNow } = useProjectContext()
  
  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId])

  // All legacy canvas logic removed - now using pure React Flow

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-black transition-colors">
      <div className={`${sidebarCollapsed ? "w-0" : "w-80"} transition-all duration-300 overflow-hidden`}>
        <ReactFlowContextLibrary
          projectId={projectId}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <header className="bg-white dark:bg-black/80 border-b border-gray-200 dark:border-white/10 px-6 py-4 relative z-10 backdrop-blur-sm transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-purple-300 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <h1 className="text-lg font-semibold text-gray-900 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-400 dark:text-transparent dark:bg-clip-text">{currentProject?.name || "Untitled Project"}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveNow}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-2 dark:border-purple-500/30 dark:hover:bg-purple-500/10 dark:text-purple-300 transition-colors"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>Save</span>
              </Button>
              
              {saveStatus === 'saving' && (
                <Badge variant="secondary" className="animate-pulse dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
                  Saving...
                </Badge>
              )}
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="text-green-600 border-green-200 dark:text-cyan-400 dark:border-cyan-500/30">
                  Saved
                </Badge>
              )}
              {saveStatus === 'error' && (
                <Badge variant="destructive">
                  Save failed
                </Badge>
              )}
              {saveStatus === 'idle' && (
                <span className="text-sm text-gray-600 dark:text-purple-400/70">Auto-save enabled</span>
              )}
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
