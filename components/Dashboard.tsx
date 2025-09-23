"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Video, ImageIcon, Clock, Bell, User, Play, Plus, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { loadProjects, createProject } from "@/lib/supabase/projects"
import { ProjectWithCanvas } from "@/lib/supabase/types"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface DashboardProps {
  onCreateProject: (projectId: string) => void
  onOpenProject: (projectId: string) => void
}

// Helper to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  
  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return `${diffWeeks}w ago`
}

export default function Dashboard({ onCreateProject, onOpenProject }: DashboardProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
  const [projects, setProjects] = useState<ProjectWithCanvas[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  
  // Load projects on mount
  useEffect(() => {
    loadProjectsData()
  }, [])
  
  const loadProjectsData = async () => {
    setIsLoading(true)
    try {
      const data = await loadProjects()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name')
      return
    }
    
    setIsCreating(true)
    try {
      const project = await createProject(
        newProjectName.trim(),
        newProjectDescription.trim() || undefined
      )
      
      if (project) {
        toast.success('Project created successfully')
        setShowCreateDialog(false)
        setNewProjectName('')
        setNewProjectDescription('')
        onCreateProject(project.id)
      }
    } catch (error: any) {
      if (error?.message?.includes('duplicate')) {
        toast.error('A project with this name already exists')
      } else {
        toast.error('Failed to create project')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-indigo-700 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-indigo-600/10">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Context Organizer</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 bg-slate-100/60 px-3 py-1.5 rounded-lg">
              <span className="text-slate-900">127</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">2.0k</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200/60 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 rounded-lg font-medium px-4 py-2 shadow-sm transition-all duration-200"
            >
              Upgrade
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              >
                <Bell className="w-4 h-4 text-slate-600" />
              </Button>
              {showNotificationsDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/60 py-3 z-50 backdrop-blur-sm">
                  <div className="px-4 py-3 text-center">
                    <p className="text-sm text-slate-500 font-medium">No news yet</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <User className="w-4 h-4 text-slate-600" />
              </Button>
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200/60 py-2 z-50 backdrop-blur-sm">
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150 flex items-center gap-2"
                    onClick={() => {
                      setShowProfileDropdown(false)
                      // Handle sign out logic here
                    }}
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="bg-white border-b border-slate-200/60 px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">Intro Video</h2>
          <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-2xl aspect-video max-w-3xl mx-auto flex items-center justify-center border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 group cursor-pointer">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md transition-shadow duration-300 border border-slate-200/60">
                <Play className="w-8 h-8 text-slate-600 ml-1" />
              </div>
              <p className="text-slate-700 font-semibold text-lg">Get Started</p>
              <p className="text-sm text-slate-500 mt-1 font-medium">Watch our introduction video</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20"></div>
        <div className="max-w-4xl mx-auto text-center px-6 relative">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-balance leading-tight tracking-tight">
            Upload everything.
            <br />
            Chat with context.
          </h2>
          <p className="text-xl text-white/90 mb-10 text-pretty max-w-2xl mx-auto leading-relaxed font-medium">
            Organize your video ad materials and have intelligent conversations with AI about your content.
          </p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-white text-indigo-700 hover:bg-slate-50 font-semibold px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg border-0 hover:scale-105"
              >
                Create New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Enter a name and optional description for your new project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of your project..."
                    disabled={isCreating}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={isCreating || !newProjectName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">All Boards</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl bg-white border-slate-200 hover:bg-slate-50 font-medium px-6 py-2.5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects yet</h3>
            <p className="text-slate-600 mb-6">Create your first project to get started</p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl border-0 shadow-sm bg-white hover:scale-[1.02] group"
                onClick={() => onOpenProject(project.id)}
              >
                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-2">
                          <FileText className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">No preview</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-slate-900 mb-2 text-lg leading-tight">{project.name}</h4>
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Updated {formatRelativeTime(project.updated_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
