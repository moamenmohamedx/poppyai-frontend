"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Dashboard from "@/components/Dashboard"
import Canvas from "@/components/Canvas"
import { ProjectProvider } from "@/app/providers/ProjectProvider"
import { useAuthStore } from "@/stores/useAuthStore"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [currentView, setCurrentView] = useState<"dashboard" | "canvas">("dashboard")
  const [currentProject, setCurrentProject] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  const handleCreateProject = (projectId: string) => {
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

  // Don't render until auth check completes
  if (!isAuthenticated) {
    return null  // Or loading spinner
  }

  return (
    <ProjectProvider>
      <main className="min-h-screen bg-gray-50">
        {currentView === "dashboard" ? (
          <Dashboard onCreateProject={handleCreateProject} onOpenProject={handleOpenProject} />
        ) : (
          <Canvas projectId={currentProject!} onBackToDashboard={handleBackToDashboard} />
        )}
      </main>
    </ProjectProvider>
  )
}
