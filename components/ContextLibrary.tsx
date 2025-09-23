"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Video,
  ImageIcon,
  FileText,
  Globe,
  File,
  Plus,
  Search,
} from "lucide-react"
import { useCanvasStore, type ContextCardPosition } from "@/stores/useCanvasStore"

interface ContextLibraryProps {
  projectId: string
  onToggleCollapse: () => void
  isCollapsed: boolean
}

const cardTypes = [
  {
    type: "ai-chat" as const,
    icon: MessageSquare,
    title: "AI Chat",
    description: "Start a new conversation",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    hoverColor: "hover:bg-purple-100",
  },
  {
    type: "video" as const,
    icon: Video,
    title: "Video Link",
    description: "Add YouTube or video URL",
    color: "text-red-600 bg-red-50 border-red-200",
    hoverColor: "hover:bg-red-100",
  },
  {
    type: "image" as const,
    icon: ImageIcon,
    title: "Image",
    description: "Upload or link an image",
    color: "text-green-600 bg-green-50 border-green-200",
    hoverColor: "hover:bg-green-100",
  },
  {
    type: "text" as const,
    icon: FileText,
    title: "Text Note",
    description: "Create a text note",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    hoverColor: "hover:bg-blue-100",
  },
  {
    type: "website" as const,
    icon: Globe,
    title: "Website",
    description: "Add a website URL",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    hoverColor: "hover:bg-orange-100",
  },
  {
    type: "document" as const,
    icon: File,
    title: "Document",
    description: "Upload a document",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    hoverColor: "hover:bg-indigo-100",
  },
]

export default function ContextLibrary({ projectId, onToggleCollapse, isCollapsed }: ContextLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { addContextCard, addChatCard } = useCanvasStore()

  const handleAddCard = (cardType: (typeof cardTypes)[0]) => {
    if (cardType.type === "ai-chat") {
      // Add chat card instead of context card
      const newChatCard = {
        id: `chat-${Date.now()}`,
        x: 400 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        width: 320,
        height: 180,
        isMinimized: true,
        zIndex: 1,
      }
      addChatCard(newChatCard)
    } else {
      // Add context card
      const newCard: ContextCardPosition = {
        id: `${cardType.type}-${Date.now()}`,
        x: 400 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        width: 320,
        height: 240,
        isMinimized: false,
        zIndex: 1,
        type: cardType.type,
        content: getDefaultContent(cardType.type),
      }
      addContextCard(newCard)
    }
  }

  const getDefaultContent = (type: string) => {
    switch (type) {
      case "video":
        return { url: "", title: "New Video", thumbnail: "" }
      case "image":
        return { url: "", alt: "New Image", caption: "" }
      case "text":
        return { content: "Enter your text here...", title: "New Note" }
      case "website":
        return { url: "", title: "New Website", description: "" }
      case "document":
        return { name: "New Document", type: "document", size: "0 KB" }
      default:
        return {}
    }
  }

  const filteredCardTypes = cardTypes.filter(
    (cardType) =>
      cardType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cardType.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="mb-4">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Add Context</h2>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search card types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-lg"
          />
        </div>
      </div>

      {/* Card Types Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredCardTypes.map((cardType) => {
            const IconComponent = cardType.icon
            return (
              <Card
                key={cardType.type}
                className={`p-4 cursor-pointer transition-all duration-200 border-2 ${cardType.color} ${cardType.hoverColor} hover:shadow-md hover:scale-105`}
                onClick={() => handleAddCard(cardType)}
              >
                <div className="text-center">
                  <div className="mb-3 flex justify-center">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h3 className="font-medium text-sm mb-1">{cardType.title}</h3>
                  <p className="text-xs opacity-75 leading-tight">{cardType.description}</p>
                  <div className="mt-3 flex justify-center">
                    <Plus className="w-4 h-4 opacity-60" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {filteredCardTypes.length === 0 && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No card types found</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-900 mb-2">How to use:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Click any card type to add it to canvas</li>
            <li>• Drag cards around to organize them</li>
            <li>• Right-click cards to connect them</li>
            <li>• Double-click to edit card content</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
