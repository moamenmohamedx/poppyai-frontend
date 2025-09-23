"use client"

import { useState } from "react"
import Dashboard from "@/components/Dashboard"
import Canvas from "@/components/Canvas"

export default function Home() {
  const [currentView, setCurrentView] = useState<"dashboard" | "canvas">("dashboard")
  const [currentProject, setCurrentProject] = useState<string | null>(null)

  const handleCreateProject = () => {
    const projectId = `project-${Date.now()}`
    setCurrentProject(projectId)
    setCurrentView("canvas")
  }

  const handleOpenProject = (projectId: string) => {
    setCurrentProject(projectId)
    setCurrentView("canvas")
  }

  const handleBackToDashboard = () => {
    setCurrentView("dashboard")
    setCurrentProject(null)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {currentView === "dashboard" ? (
        <Dashboard onCreateProject={handleCreateProject} onOpenProject={handleOpenProject} />
      ) : (
        <Canvas projectId={currentProject!} onBackToDashboard={handleBackToDashboard} />
      )}
    </main>
  )
}
