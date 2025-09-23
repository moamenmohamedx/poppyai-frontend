"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import ReactFlowContextLibrary from "./ReactFlowContextLibrary"
import ReactFlowCanvas from "./ReactFlowCanvas"
import { useProjectStore } from "@/stores/useProjectStore"
import { useProjectContext } from "@/app/providers/ProjectProvider"
import { Badge } from "@/components/ui/badge"

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
    <div className="h-screen flex bg-gray-50">
      <div className={`${sidebarCollapsed ? "w-0" : "w-80"} transition-all duration-300 overflow-hidden`}>
        <ReactFlowContextLibrary
          projectId={projectId}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">{currentProject?.name || "Untitled Project"}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveNow}
                disabled={saveStatus === 'saving'}
                className="flex items-center space-x-2"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span>Save</span>
              </Button>
              
              {saveStatus === 'saving' && (
                <Badge variant="secondary" className="animate-pulse">
                  Saving...
                </Badge>
              )}
              {saveStatus === 'saved' && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Saved
                </Badge>
              )}
              {saveStatus === 'error' && (
                <Badge variant="destructive">
                  Save failed
                </Badge>
              )}
              {saveStatus === 'idle' && (
                <span className="text-sm text-gray-600">Auto-save enabled</span>
              )}
            </div>
          </div>
        </header>

        {/* Pure React Flow Canvas */}
        <div className="absolute inset-0 top-16">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading project...</p>
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
