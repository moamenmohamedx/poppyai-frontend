"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Minimize2, Maximize2, X, Send, Paperclip, Search, Plus, MessageSquare, Bot } from "lucide-react"
import { useCanvasStore, type ChatCardPosition } from "@/stores/useCanvasStore"
import { useProjectStore, type Chat, type ChatMessage } from "@/stores/useProjectStore"
import ContextMenu from "./ContextMenu"

interface ChatCardProps {
  card: ChatCardPosition
  projectId: string
}

export default function ChatCard({ card, projectId }: ChatCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    updateChatCard,
    removeChatCard,
    copyChatCard,
    bringToFront,
    canvasZoom,
    startConnection,
    isConnecting,
    connectionSource,
    cancelConnection,
  } = useCanvasStore()

  const { currentProject, addChatToProject, addMessageToChat } = useProjectStore()

  const chats = currentProject?.chats || []
  const currentChat = chats.find((chat) => chat.id === activeChat)
  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCopy = () => {
    copyChatCard(card.id)
    setContextMenu(null)
  }

  const handleDelete = () => {
    removeChatCard(card.id)
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
      setDragOffset({
        x: (e.clientX - rect.left) / canvasZoom,
        y: (e.clientY - rect.top) / canvasZoom,
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const canvasRect = document.querySelector("[data-canvas]")?.getBoundingClientRect()
      if (!canvasRect) return

      const { canvasOffset } = useCanvasStore.getState()

      updateChatCard(card.id, {
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
  }, [isDragging, dragOffset, card.id, updateChatCard, canvasZoom])

  const handleToggleMinimize = () => {
    updateChatCard(card.id, {
      isMinimized: !card.isMinimized,
    })
  }

  const handleClose = () => {
    removeChatCard(card.id)
  }

  const handleNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      name: `Chat ${chats.length + 1}`,
      messages: [],
      createdAt: new Date(),
    }
    addChatToProject(projectId, newChat)
    setActiveChat(newChat.id)
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeChat) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: newMessage,
      timestamp: new Date(),
    }

    addMessageToChat(projectId, activeChat, message)

    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        type: "ai",
        content: `I understand you're asking about "${newMessage}". Based on your uploaded materials, I can help you analyze the content and provide insights.`,
        timestamp: new Date(),
        citations: ["brand.pdf", "video1.mp4"],
      }
      addMessageToChat(projectId, activeChat, aiMessage)
    }, 1000)

    setNewMessage("")
  }

  const lastTwoMessages = currentChat?.messages.slice(-2) || []

  if (!card.isMinimized) {
    return (
      <>
        <div
          ref={cardRef}
          className="fixed inset-0 w-full h-full bg-white z-50"
          data-card
          onContextMenu={handleRightClick}
        >
          {/* Header */}
          <div
            className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between cursor-move"
            data-drag-handle
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6" />
              <h3 className="font-semibold text-lg">AI Chat</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleMinimize}
                className="h-8 w-8 p-0 text-white hover:bg-indigo-700"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-white hover:bg-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex h-full">
            {/* Left Panel - Chat List */}
            <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
              <div className="p-4 border-b border-gray-200">
                <Button
                  onClick={handleNewChat}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Conversation
                </Button>
              </div>

              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Previous Conversations</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className={`w-full text-left p-4 hover:bg-white transition-colors border-b border-gray-100 ${
                      activeChat === chat.id ? "bg-white border-r-2 border-r-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900 truncate block">{chat.name}</span>
                        <div className="text-xs text-gray-500 mt-1">{chat.messages.length} messages</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <h2 className="text-xl font-semibold text-gray-900">{currentChat?.name || "New Conversation"}</h2>
                <p className="text-sm text-gray-600 mt-1">Chat with your AI assistant about your content</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                {currentChat?.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-2xl px-6 py-4 rounded-2xl ${
                        message.type === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-900 shadow-sm border border-gray-200"
                      }`}
                    >
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      {message.citations && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.citations.map((citation, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                            >
                              {citation}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
                {currentChat?.messages.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                    <p className="text-gray-600">
                      Ask anything about your uploaded content and get AI-powered insights.
                    </p>
                  </div>
                )}
              </div>

              {/* Context Indicator */}
              <div className="px-6 py-3 bg-indigo-50 border-t border-indigo-100">
                <div className="text-sm text-indigo-700">
                  <span className="font-medium">Context:</span> brand.pdf, video1.mp4, campaign-assets.zip
                </div>
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-gray-200 bg-white">
                <div className="flex space-x-4">
                  <Button variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Textarea
                    placeholder="Ask anything or press / for actions"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1 min-h-[50px] max-h-32 resize-none rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                      <Search className="w-3 h-3 mr-1" />
                      Search
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                      Get Key Insights
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                      Write Email
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                      Summarize
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Edge Handle */}
          <div
            className={`absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform z-50 ${
              isConnecting && connectionSource?.id === card.id ? "animate-pulse bg-blue-600" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation()
              if (isConnecting && connectionSource?.id === card.id) {
                cancelConnection()
              } else {
                startConnection(card.id, "chat")
              }
            }}
          />
        </div>
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

  return (
    <>
      <Card
        ref={cardRef}
        className={`absolute bg-white shadow-lg rounded-xl border-2 ${
          isConnecting && connectionSource?.id !== card.id ? "border-blue-300 hover:border-blue-500" : "border-gray-200"
        } overflow-hidden select-none transition-all duration-200 hover:shadow-xl ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: card.x,
          top: card.y,
          width: 400,
          height: 280,
          zIndex: card.zIndex,
        }}
        data-card
        onContextMenu={handleRightClick}
      >
        {/* Header */}
        <div
          className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between cursor-move"
          data-drag-handle
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <h3 className="font-medium text-sm">AI Chat</h3>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMinimize}
              className="h-7 w-7 p-0 text-white hover:bg-indigo-700"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0 text-white hover:bg-red-500">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Compact Content */}
        <div className="p-4 h-full overflow-hidden">
          <div className="space-y-3">
            {lastTwoMessages.slice(-3).map((message) => (
              <div
                key={message.id}
                className={`text-xs ${
                  message.type === "user" ? "text-right text-indigo-600" : "text-left text-gray-700"
                }`}
              >
                <div className="truncate font-medium">{message.content}</div>
              </div>
            ))}
            {lastTwoMessages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <div className="font-medium">Start a conversation</div>
                <div className="text-xs mt-1">Click maximize to begin chatting</div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Edge Handle */}
        <div
          className={`absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform ${
            isConnecting && connectionSource?.id === card.id ? "animate-pulse bg-blue-600" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation()
            if (isConnecting && connectionSource?.id === card.id) {
              cancelConnection()
            } else {
              startConnection(card.id, "chat")
            }
          }}
        />
      </Card>
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
