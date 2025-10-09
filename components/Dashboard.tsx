"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Video, ImageIcon, Clock, Bell, User, Play, Plus, Loader2, MoreVertical, Edit2, Trash2 } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ThemeToggle from "./ThemeToggle"
import { useAuthStore } from "@/stores/useAuthStore"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { renameProject, deleteProject } from '@/lib/api/projects'

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
  const router = useRouter()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  // State for project rename and delete
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  // Use React Query to fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: loadProjects,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
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
        // Invalidate projects query to refetch and show new project
        queryClient.invalidateQueries({ queryKey: ['projects'] })
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

  // Rename project mutation with optimistic updates
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameProject(id, name),
    onMutate: async ({ id, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<ProjectWithCanvas[]>(['projects'])

      // Optimistically update to new value
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithCanvas[]>(
          ['projects'],
          previousProjects.map(p => p.id === id ? { ...p, name } : p)
        )
      }

      return { previousProjects }
    },
    onSuccess: () => {
      setRenameProjectId(null)
      setRenameValue('')
      toast.success('Project renamed successfully')
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects)
      }
      toast.error(`Rename failed: ${error.message}`)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })

  // Delete project mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onMutate: async (deletedProjectId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects'] })

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<ProjectWithCanvas[]>(['projects'])

      // Optimistically remove from list
      if (previousProjects) {
        queryClient.setQueryData<ProjectWithCanvas[]>(
          ['projects'],
          previousProjects.filter(p => p.id !== deletedProjectId)
        )
      }

      return { previousProjects }
    },
    onSuccess: () => {
      setDeleteConfirmOpen(false)
      setProjectToDelete(null)
      toast.success('Project deleted successfully')
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects)
      }
      toast.error(`Delete failed: ${error.message}`)
    },
    onSettled: (_, __, deletedProjectId) => {
      // Clean up and refetch
      queryClient.removeQueries({ queryKey: ['project', deletedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black transition-colors">
      <header className="bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-white/10 px-6 py-5 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-indigo-700 dark:bg-gradient-to-br dark:from-purple-500 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-indigo-600/10 dark:ring-purple-500/30 dark:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-400 dark:text-transparent dark:bg-clip-text tracking-tight transition-colors">Context Organizer</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-purple-400 bg-slate-100/60 dark:bg-purple-500/10 px-3 py-1.5 rounded-lg border border-transparent dark:border-purple-500/20 transition-colors">
              <span className="text-slate-900 dark:text-purple-300">127</span>
              <span className="text-slate-400 dark:text-purple-500">/</span>
              <span className="text-slate-500 dark:text-purple-400/70">2.0k</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200/60 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300 dark:from-purple-500/10 dark:to-cyan-500/10 dark:text-purple-400 dark:border-purple-500/30 dark:hover:from-purple-500/20 dark:hover:to-cyan-500/20 dark:hover:border-purple-400/50 rounded-lg font-medium px-4 py-2 shadow-sm transition-all duration-200"
            >
              Upgrade
            </Button>

            <ThemeToggle />

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors duration-200"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              >
                <Bell className="w-4 h-4 text-slate-600 dark:text-purple-400" />
              </Button>
              {showNotificationsDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-black/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 py-3 z-50 backdrop-blur-sm">
                  <div className="px-4 py-3 text-center">
                    <p className="text-sm text-slate-500 dark:text-purple-400 font-medium">No news yet</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors duration-200"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              >
                <User className="w-4 h-4 text-slate-600 dark:text-purple-400" />
              </Button>
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-black/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 py-2 z-50 backdrop-blur-sm">
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-purple-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors duration-150 flex items-center gap-2"
                    onClick={() => {
                      setShowProfileDropdown(false)
                      logout()
                      toast.success('Signed out successfully')
                      router.push('/auth/login')
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

      <section className="bg-white dark:bg-black border-b border-slate-200/60 dark:border-white/10 px-6 py-12 transition-colors">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight">Intro Video</h2>
          <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-purple-900/20 dark:via-black dark:to-cyan-900/20 rounded-2xl aspect-video max-w-3xl mx-auto flex items-center justify-center border border-slate-200/60 dark:border-purple-500/30 shadow-sm hover:shadow-md dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300 group cursor-pointer">
            <div className="text-center">
              <div className="w-20 h-20 bg-white dark:bg-black/50 dark:backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md transition-all duration-300 border border-slate-200/60 dark:border-purple-500/30 dark:group-hover:border-purple-400 dark:group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                <Play className="w-8 h-8 text-slate-600 dark:text-purple-400 ml-1" />
              </div>
              <p className="text-slate-700 dark:text-purple-300 font-semibold text-lg">Get Started</p>
              <p className="text-sm text-slate-500 dark:text-purple-400/70 mt-1 font-medium">Watch our introduction video</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 dark:from-black dark:via-purple-900/30 dark:to-black text-white py-20 relative overflow-hidden transition-colors">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 dark:from-purple-500/10 dark:to-cyan-500/10"></div>
        <div className="dark:absolute dark:inset-0 dark:bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.15),transparent_70%)]"></div>
        <div className="max-w-4xl mx-auto text-center px-6 relative">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-balance leading-tight tracking-tight dark:bg-gradient-to-r dark:from-purple-400 dark:via-purple-300 dark:to-cyan-400 dark:text-transparent dark:bg-clip-text">
            Upload everything.
            <br />
            Chat with context.
          </h2>
          <p className="text-xl text-white/90 dark:text-purple-200/90 mb-10 text-pretty max-w-2xl mx-auto leading-relaxed font-medium">
            Organize your video ad materials and have intelligent conversations with AI about your content.
          </p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-white text-indigo-700 hover:bg-slate-50 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-500 dark:text-black dark:hover:from-purple-400 dark:hover:to-cyan-400 font-semibold px-10 py-4 rounded-xl shadow-lg hover:shadow-xl dark:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 text-lg border-0 hover:scale-105 dark:animate-neon-pulse"
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
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">All Boards</h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl bg-white dark:bg-purple-500/10 border-slate-200 dark:border-purple-500/30 hover:bg-slate-50 dark:hover:bg-purple-500/20 font-medium px-6 py-2.5 shadow-sm hover:shadow-md dark:shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-purple-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 dark:bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-transparent dark:border-purple-500/20">
              <Plus className="w-8 h-8 text-slate-400 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-slate-600 dark:text-purple-300/70 mb-6">Create your first project to get started</p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-500 dark:hover:from-purple-400 dark:hover:to-cyan-400 dark:text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Card
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl border-0 shadow-sm bg-white dark:bg-black dark:border dark:border-purple-500/20 hover:scale-[1.02] dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                  onClick={() => renameProjectId !== project.id && onOpenProject(project.id)}
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-purple-900/20 dark:to-cyan-900/20 relative overflow-hidden">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-white/50 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2 dark:border dark:border-purple-500/30">
                            <FileText className="w-6 h-6 text-slate-400 dark:text-purple-400" />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-purple-400/70 font-medium">No preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      {renameProjectId === project.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => {
                            if (renameValue.trim() && renameValue !== project.name) {
                              renameMutation.mutate({ id: project.id, name: renameValue })
                            } else {
                              setRenameProjectId(null)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && renameValue.trim() && renameValue !== project.name) {
                              renameMutation.mutate({ id: project.id, name: renameValue })
                            } else if (e.key === 'Escape') {
                              setRenameProjectId(null)
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-lg font-bold rounded border border-indigo-500 dark:border-purple-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight flex-1">{project.name}</h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRenameProjectId(project.id)
                                  setRenameValue(project.name)
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setProjectToDelete(project.id)
                                  setDeleteConfirmOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-slate-600 dark:text-purple-300/70 mb-4 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-purple-400/60 font-medium">
                      <Clock className="w-4 h-4" />
                      <span>Updated {formatRelativeTime(project.updated_at)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all associated data
              (canvas, conversations, messages). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && deleteMutation.mutate(projectToDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
