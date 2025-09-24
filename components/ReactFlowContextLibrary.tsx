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
import { useReactFlowStore } from "@/stores/useReactFlowStore"

interface ReactFlowContextLibraryProps {
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
    color: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-500/30",
    hoverColor: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
  },
  {
    type: "video" as const,
    icon: Video,
    title: "Video Link",
    description: "Add YouTube or video URL",
    color: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30",
    hoverColor: "hover:bg-red-100 dark:hover:bg-red-900/50",
  },
  {
    type: "image" as const,
    icon: ImageIcon,
    title: "Image",
    description: "Upload or link an image",
    color: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-500/30",
    hoverColor: "hover:bg-green-100 dark:hover:bg-green-900/50",
  },
  {
    type: "text" as const,
    icon: FileText,
    title: "Text Note",
    description: "Create a text note",
    color: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-500/30",
    hoverColor: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  {
    type: "website" as const,
    icon: Globe,
    title: "Website",
    description: "Add a website URL",
    color: "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-500/30",
    hoverColor: "hover:bg-orange-100 dark:hover:bg-orange-900/50",
  },
  {
    type: "document" as const,
    icon: File,
    title: "Document",
    description: "Upload a document",
    color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-500/30",
    hoverColor: "hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
]

export default function ReactFlowContextLibrary({ projectId, onToggleCollapse, isCollapsed }: ReactFlowContextLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { addContextNode, addChatNode } = useReactFlowStore()

  const handleAddCard = (cardType: (typeof cardTypes)[0]) => {
    // Get the React Flow wrapper element to calculate viewport center
    const reactFlowWrapper = document.querySelector('.react-flow')
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement
    
    if (!reactFlowWrapper || !viewportElement) {
      // Fallback if elements not found
      const fallbackPosition = { x: 400, y: 200 }
      if (cardType.type === "ai-chat") {
        addChatNode(fallbackPosition)
      } else {
        addContextNode(cardType.type, fallbackPosition)
      }
      return
    }
    
    // Get the current viewport transform
    const transform = viewportElement.style.transform
    const transformMatch = transform.match(/translate\(([^,]+),([^)]+)\) scale\(([^)]+)\)/)
    
    let translateX = 0, translateY = 0, scale = 1
    if (transformMatch) {
      translateX = parseFloat(transformMatch[1])
      translateY = parseFloat(transformMatch[2])
      scale = parseFloat(transformMatch[3])
    }
    
    // Calculate center of the visible area
    const bounds = reactFlowWrapper.getBoundingClientRect()
    const centerX = bounds.width / 2
    const centerY = bounds.height / 2
    
    // Convert to flow coordinates
    const flowX = (centerX - translateX) / scale
    const flowY = (centerY - translateY) / scale
    
    // Add small random offset to prevent exact stacking
    const randomOffset = () => Math.random() * 40 - 20
    const position = {
      x: flowX + randomOffset() - 200, // Subtract half of node width (400/2)
      y: flowY + randomOffset() - 140  // Subtract half of node height (280/2)
    }
    
    if (cardType.type === "ai-chat") {
      addChatNode(position)
    } else {
      addContextNode(cardType.type, position)
    }
  }

  const filteredCardTypes = cardTypes.filter(
    (cardType) =>
      cardType.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cardType.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isCollapsed) {
    return (
      <div className="relative w-16 h-full bg-white dark:bg-black border-r border-gray-200 dark:border-white/10 flex flex-col items-center justify-center transition-all">
        <Button 
          variant="default" 
          size="default" 
          onClick={onToggleCollapse} 
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 dark:shadow-[0_0_20px_rgba(168,85,247,0.6)] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]"
          title="Expand sidebar"
          aria-label="Expand context library sidebar"
          aria-expanded="false"
          tabIndex={0}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        {/* Visual indicator - above button */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-8 bg-gradient-to-b from-transparent via-indigo-600/50 to-transparent dark:via-purple-600/50 rounded-full animate-pulse" />
          </div>
          
          {/* Visual indicator - below button */}
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
            <div className="w-1 h-8 bg-gradient-to-t from-transparent via-indigo-600/50 to-transparent dark:via-purple-600/50 rounded-full animate-pulse" />
          </div>
        </div>
        
        {/* Tooltip hint */}
        <div className="absolute left-full ml-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 dark:bg-purple-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            Click to expand
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-black border-r border-gray-200 dark:border-white/10 flex flex-col h-full transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Add Nodes</h2>
          <Button 
            variant="outline" 
            size="default" 
            onClick={onToggleCollapse} 
            className="border-gray-300 hover:bg-gray-100 dark:border-purple-500/50 dark:hover:bg-purple-500/20 dark:text-purple-400 transition-all"
            title="Collapse sidebar"
            aria-label="Collapse context library sidebar"
            aria-expanded="true"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-purple-400" />
          <Input
            placeholder="Search node types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-lg dark:bg-black/50 dark:border-purple-500/30 dark:text-purple-200 dark:placeholder-purple-400/50"
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
                className={`p-4 cursor-pointer transition-all duration-200 border-2 ${cardType.color} ${cardType.hoverColor} hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105`}
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
            <Search className="w-8 h-8 text-gray-400 dark:text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-purple-400/70">No node types found</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-purple-900/20 rounded-lg dark:border dark:border-purple-500/20">
          <h4 className="font-medium text-sm text-gray-900 dark:text-purple-300 mb-2">How to use:</h4>
          <ul className="text-xs text-gray-600 dark:text-purple-400/70 space-y-1">
            <li>• Click any node type to add it to canvas</li>
            <li>• Drag nodes around to organize them</li>
            <li>• Connect context nodes to chat nodes</li>
            <li>• Use keyboard shortcuts (Delete, Ctrl/Cmd)</li>
            <li>• Drag files onto canvas to create nodes</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
