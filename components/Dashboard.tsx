"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Video, ImageIcon, Clock, Bell, User, Play } from "lucide-react"
import { useState } from "react"

interface DashboardProps {
  onCreateProject: () => void
  onOpenProject: (projectId: string) => void
}

const mockProjects = [
  {
    id: "project-1",
    name: "Summer Campaign 2024",
    docs: 3,
    videos: 2,
    images: 5,
    updatedAt: "2h ago",
    thumbnail: "/summer-campaign-video-thumbnail.jpg",
  },
  {
    id: "project-2",
    name: "Product Launch Video",
    docs: 1,
    videos: 4,
    images: 2,
    updatedAt: "1d ago",
    thumbnail: "/product-launch-thumbnail.png",
  },
  {
    id: "project-3",
    name: "Brand Guidelines",
    docs: 8,
    videos: 0,
    images: 12,
    updatedAt: "3d ago",
    thumbnail: "/placeholder-ega9y.png",
  },
  {
    id: "project-4",
    name: "Social Media Assets",
    docs: 2,
    videos: 6,
    images: 15,
    updatedAt: "1w ago",
    thumbnail: "/placeholder-yzkwc.png",
  },
  {
    id: "project-5",
    name: "Client Presentation",
    docs: 5,
    videos: 1,
    images: 3,
    updatedAt: "2w ago",
    thumbnail: "/placeholder-95it6.png",
  },
]

export default function Dashboard({ onCreateProject, onOpenProject }: DashboardProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)

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
          <Button
            onClick={onCreateProject}
            size="lg"
            className="bg-white text-indigo-700 hover:bg-slate-50 font-semibold px-10 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg border-0 hover:scale-105"
          >
            Create New Project
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">All Boards</h3>
          <Button
            variant="outline"
            onClick={onCreateProject}
            className="rounded-xl bg-white border-slate-200 hover:bg-slate-50 font-medium px-6 py-2.5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockProjects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl border-0 shadow-sm bg-white hover:scale-[1.02] group"
              onClick={() => onOpenProject(project.id)}
            >
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                <img
                  src={project.thumbnail || "/placeholder.svg"}
                  alt={project.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h4 className="font-bold text-slate-900 mb-4 text-lg leading-tight">{project.name}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5 font-medium">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>{project.docs}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Video className="w-4 h-4 text-slate-500" />
                    <span>{project.videos}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>{project.images}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Updated {project.updatedAt}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
