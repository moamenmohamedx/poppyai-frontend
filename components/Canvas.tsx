"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import ReactFlowContextLibrary from "./ReactFlowContextLibrary"
import ReactFlowCanvas from "./ReactFlowCanvas"
import { useProjectStore } from "@/stores/useProjectStore"

interface CanvasProps {
  projectId: string
  onBackToDashboard: () => void
}

export default function Canvas({ projectId, onBackToDashboard }: CanvasProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { currentProject } = useProjectStore()

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
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 font-medium">React Flow Active</span>
              </div>
              <span className="text-sm text-gray-600">Auto-saved</span>
            </div>
          </div>
        </header>

        {/* Pure React Flow Canvas */}
        <div className="absolute inset-0 top-16">
          <ReactFlowCanvas projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
