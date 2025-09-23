"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ContextMenu from "./ContextMenu"
import {
  Minimize2,
  Maximize2,
  X,
  FileText,
  Video,
  ImageIcon,
  Globe,
  File,
  MessageSquare,
  Edit3,
  Save,
  Link2,
  Upload,
  Play,
} from "lucide-react"
import { useCanvasStore, type ContextCardPosition } from "@/stores/useCanvasStore"

interface ContextCardProps {
  card: ContextCardPosition
  projectId: string
}

export default function ContextCard({ card, projectId }: ContextCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(card.content || {})
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isDragConnecting, setIsDragConnecting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    updateContextCard,
    removeContextCard,
    copyContextCard,
    bringToFront,
    startConnection,
    completeConnection,
    isConnecting,
    connectionSource,
    cancelConnection,
  } = useCanvasStore()

  const extractVideoThumbnail = async (url: string) => {
    try {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = ""
        if (url.includes("youtube.com/watch?v=")) {
          videoId = url.split("v=")[1].split("&")[0]
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1].split("?")[0]
        }
        if (videoId) {
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          setVideoThumbnail(thumbnailUrl)
          return thumbnailUrl
        }
      }
    } catch (error) {
      console.error("Error extracting video thumbnail:", error)
    }
    return null
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (card.type === "image" && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setEditContent({
          ...editContent,
          url: imageUrl,
          alt: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        })
      }
      reader.readAsDataURL(file)
    } else if (card.type === "document") {
      setEditContent({
        ...editContent,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
      })
    }
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCopy = () => {
    copyContextCard(card.id)
    setContextMenu(null)
  }

  const handleDelete = () => {
    removeContextCard(card.id)
    setContextMenu(null)
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest("[data-drag-handle]")) return

    e.preventDefault()
    e.stopPropagation()

    setIsDragging(true)
    bringToFront(card.id)

    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      const { canvasZoom } = useCanvasStore.getState()
      setDragOffset({
        x: (e.clientX - rect.left) / canvasZoom,
        y: (e.clientY - rect.top) / canvasZoom,
      })
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", card.id)
    e.dataTransfer.effectAllowed = "link"
    setIsDragConnecting(true)
    startConnection(card.id, "context")
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragConnecting(false)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const canvasRect = document.querySelector("[data-canvas]")?.getBoundingClientRect()
      if (!canvasRect) return

      const { canvasOffset, canvasZoom } = useCanvasStore.getState()

      updateContextCard(card.id, {
        x: (e.clientX - canvasRect.left - canvasOffset.x) / canvasZoom - dragOffset.x,
        y: (e.clientY - canvasRect.top - canvasOffset.y) / canvasZoom - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset, card.id, updateContextCard])

  const handleToggleMinimize = () => {
    updateContextCard(card.id, { isMinimized: !card.isMinimized })
  }

  const handleClose = () => {
    removeContextCard(card.id)
  }

  const handleSaveEdit = () => {
    updateContextCard(card.id, { content: editContent })
    setIsEditing(false)
  }

  const getCardIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-5 h-5 text-red-600" />
      case "image":
        return <ImageIcon className="w-5 h-5 text-green-600" />
      case "text":
        return <FileText className="w-5 h-5 text-blue-600" />
      case "website":
        return <Globe className="w-5 h-5 text-orange-600" />
      case "document":
        return <File className="w-5 h-5 text-indigo-600" />
      case "ai-chat":
        return <MessageSquare className="w-5 h-5 text-purple-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  const renderCardContent = () => {
    if (isEditing) {
      return renderEditMode()
    }

    switch (card.type) {
      case "video":
        return renderVideoContent()
      case "image":
        return renderImageContent()
      case "text":
        return renderTextContent()
      case "website":
        return renderWebsiteContent()
      case "document":
        return renderDocumentContent()
      default:
        return <div className="p-4 text-center text-gray-500">Unknown card type</div>
    }
  }

  const renderVideoContent = () => (
    <div className="p-4 space-y-3">
      {card.content?.url ? (
        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden relative">
          {videoThumbnail ? (
            <div className="relative w-full h-full">
              <img
                src={videoThumbnail || "/placeholder.svg"}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <Play className="w-8 h-8 text-white" />
              </div>
            </div>
          ) : (
            <iframe
              src={
                card.content.url.includes("youtube.com")
                  ? card.content.url.replace("watch?v=", "embed/")
                  : card.content.url
              }
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
            />
          )}
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <Video className="w-8 h-8 text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">No video URL</span>
        </div>
      )}
      <div>
        <h4 className="font-medium text-sm">{card.content?.title || "Video"}</h4>
        {card.content?.url && <p className="text-xs text-gray-500 truncate">{card.content.url}</p>}
      </div>
    </div>
  )

  const renderImageContent = () => (
    <div className="p-4 space-y-3">
      {card.content?.url ? (
        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={card.content.url || "/placeholder.svg"}
            alt={card.content?.alt || "Image"}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">No image</span>
        </div>
      )}
      <div>
        <h4 className="font-medium text-sm">{card.content?.alt || "Image"}</h4>
        {card.content?.caption && <p className="text-xs text-gray-500">{card.content.caption}</p>}
        {card.content?.size && <p className="text-xs text-gray-400">{card.content.size}</p>}
      </div>
    </div>
  )

  const renderTextContent = () => (
    <div className="p-4 space-y-3">
      <h4 className="font-medium text-sm">{card.content?.title || "Text Note"}</h4>
      <div className="bg-gray-50 rounded-lg p-3 max-h-24 overflow-y-auto">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.content?.content || "No content"}</p>
      </div>
    </div>
  )

  const renderWebsiteContent = () => (
    <div className="p-4 space-y-3">
      <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center">
        <Globe className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <h4 className="font-medium text-sm">{card.content?.title || "Website"}</h4>
        {card.content?.url && <p className="text-xs text-gray-500 truncate">{card.content.url}</p>}
        {card.content?.description && <p className="text-xs text-gray-600 mt-1">{card.content.description}</p>}
      </div>
    </div>
  )

  const renderDocumentContent = () => (
    <div className="p-4 space-y-3">
      <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center">
        <File className="w-6 h-6 text-gray-400" />
      </div>
      <div>
        <h4 className="font-medium text-sm">{card.content?.name || "Document"}</h4>
        <p className="text-xs text-gray-500">{card.content?.size || "0 KB"}</p>
        {card.content?.type && <p className="text-xs text-gray-400">{card.content.type}</p>}
      </div>
    </div>
  )

  const renderEditMode = () => (
    <div className="p-4 space-y-3">
      {card.type === "video" && (
        <>
          <Input
            placeholder="Video URL (YouTube, Vimeo, etc.)"
            value={editContent.url || ""}
            onChange={async (e) => {
              const url = e.target.value
              setEditContent({ ...editContent, url })
              if (url) {
                await extractVideoThumbnail(url)
              }
            }}
          />
          <Input
            placeholder="Title"
            value={editContent.title || ""}
            onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
          />
        </>
      )}
      {card.type === "image" && (
        <>
          <div className="flex space-x-2">
            <Input
              placeholder="Image URL"
              value={editContent.url || ""}
              onChange={(e) => setEditContent({ ...editContent, url: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <Input
            placeholder="Alt text"
            value={editContent.alt || ""}
            onChange={(e) => setEditContent({ ...editContent, alt: e.target.value })}
          />
          <Input
            placeholder="Caption"
            value={editContent.caption || ""}
            onChange={(e) => setEditContent({ ...editContent, caption: e.target.value })}
          />
        </>
      )}
      {card.type === "text" && (
        <>
          <Input
            placeholder="Title"
            value={editContent.title || ""}
            onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
          />
          <Textarea
            placeholder="Content"
            value={editContent.content || ""}
            onChange={(e) => setEditContent({ ...editContent, content: e.target.value })}
            rows={4}
          />
        </>
      )}
      {card.type === "website" && (
        <>
          <Input
            placeholder="Website URL"
            value={editContent.url || ""}
            onChange={(e) => setEditContent({ ...editContent, url: e.target.value })}
          />
          <Input
            placeholder="Title"
            value={editContent.title || ""}
            onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={editContent.description || ""}
            onChange={(e) => setEditContent({ ...editContent, description: e.target.value })}
          />
        </>
      )}
      {card.type === "document" && (
        <>
          <div className="flex space-x-2">
            <Input
              placeholder="Document name"
              value={editContent.name || ""}
              onChange={(e) => setEditContent({ ...editContent, name: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          {editContent.size && <p className="text-xs text-gray-500">Size: {editContent.size}</p>}
        </>
      )}
    </div>
  )

  return (
    <>
      <Card
        ref={cardRef}
        className={`absolute bg-white shadow-lg rounded-xl border-2 ${
          isConnecting && connectionSource?.id !== card.id ? "border-blue-300 hover:border-blue-500" : "border-gray-200"
        } ${isDragging ? "cursor-grabbing shadow-2xl" : "cursor-grab"} ${
          isDragConnecting ? "opacity-75" : ""
        } transition-all overflow-hidden select-none`}
        style={{
          left: card.x,
          top: card.y,
          width: 400,
          height: card.isMinimized ? 60 : 280,
          zIndex: card.zIndex,
        }}
        onContextMenu={handleRightClick}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-xl cursor-move"
          data-drag-handle
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {getCardIcon(card.type)}
            <span className="text-sm font-medium text-gray-900 truncate">
              {card.content?.title || card.content?.name || card.type.charAt(0).toUpperCase() + card.type.slice(1)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {!card.isMinimized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    handleSaveEdit()
                  } else {
                    setEditContent(card.content || {})
                    setIsEditing(true)
                  }
                }}
                className="h-6 w-6 p-0 text-gray-500 hover:text-blue-500"
              >
                {isEditing ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startConnection(card.id, "context")}
              className="h-6 w-6 p-0 text-gray-500 hover:text-green-500"
            >
              <Link2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMinimize}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              {card.isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!card.isMinimized && renderCardContent()}

        {/* Connection edge handle */}
        <div
          className={`absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform ${
            isConnecting && connectionSource?.id === card.id ? "animate-pulse bg-blue-600" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation()
            if (isConnecting && connectionSource?.id === card.id) {
              // Cancel connection if clicking the same node
              cancelConnection()
            } else {
              // Start new connection
              startConnection(card.id, "context")
            }
          }}
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            handleDragStart(e)
          }}
        />
      </Card>
      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onClose={handleCloseContextMenu}
        />
      )}
    </>
  )
}
