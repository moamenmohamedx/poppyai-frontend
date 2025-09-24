"use client"

import { memo, useState, useEffect } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Plus, Send, Paperclip, Globe, FileText, Image, Copy } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { toast } from 'sonner'

interface ChatNodeProps extends NodeProps {
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function ChatNode({ data, selected, onNodeContextMenu }: ChatNodeProps) {
  const [activeConversation, setActiveConversation] = useState(0)
  const [message, setMessage] = useState('')
  const [conversations, setConversations] = useState([
    { id: 0, title: 'New Chat', messages: [] },
    { id: 1, title: 'Marketing Strategy', messages: [] },
    { id: 2, title: 'Product Launch', messages: [] },
  ])
  const { deleteNode } = useReactFlowStore()
  
  // Keyboard handler for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        handleDelete()
      }
    }
    
    if (selected) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [selected])
  
  const handleDelete = () => {
    deleteNode(data.id as string)
    toast.success('Node deleted')
  }
  
  return (
    <>
      <div 
        className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}
        onContextMenu={onNodeContextMenu}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900 dark:handle-glow-purple dark:handle-glow-purple-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
        
        {/* Two-Column Chat Node UI */}
        <Card className="w-[700px] h-[700px] bg-white dark:bg-black shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-gray-200 dark:border-purple-500/30 transition-all overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-purple-100 dark:bg-purple-900/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm text-gray-800 dark:text-purple-300">AI Chat</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded"
              onClick={() => deleteNode(data.id as string)}
            >
              <X className="w-3.5 h-3.5 text-gray-600 dark:text-purple-400" />
            </Button>
          </div>
          
          {/* Two Column Layout */}
          <div className="flex h-[calc(100%-44px)]">
            {/* Left Column: Conversation List */}
            <div className="w-[200px] bg-purple-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 flex flex-col">
              <div className="p-3">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-medium text-sm py-2 rounded-lg shadow-sm"
                  onClick={() => {
                    const newId = conversations.length
                    setConversations([...conversations, { id: newId, title: `New Chat`, messages: [] }])
                    setActiveConversation(newId)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Conversation
                </Button>
              </div>
              <div className="px-3 pb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Previous Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 dark:text-gray-500">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConversation(conv.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all mb-1 ${
                        activeConversation === conv.id 
                          ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm font-medium' 
                          : 'hover:bg-purple-100/50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {conv.title}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="flex-1 bg-gray-50 dark:bg-slate-950 flex flex-col">
              {/* Chat Header */}
              <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">New Conversation</h3>
                  <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-1">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto">
                {conversations[activeConversation]?.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="max-w-sm">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Start a new conversation</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Ask anything or press / for actions</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Messages would be mapped here */}
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Globe className="w-3.5 h-3.5" />
                    Mindmap
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <FileText className="w-3.5 h-3.5" />
                    Landing Page
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                    <Globe className="w-3.5 h-3.5" />
                    VSL Page
                  </button>
                </div>
                <div className="flex gap-3 mt-2">
                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">Summarize</button>
                  <button className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">Get Key Insights</button>
                </div>
              </div>
              
              {/* Input Area - Simplified */}
              <div className="px-4 pb-4">
                <div className="relative bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                  <div className="flex items-center px-3 py-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask anything or press / for actions"
                      className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && message.trim()) {
                          setMessage('')
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5 ml-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        <Image className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-1" />
                      <Button 
                        size="sm" 
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded flex items-center gap-1.5"
                        onClick={() => {
                          if (message.trim()) {
                            setMessage('')
                          }
                        }}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        <Handle
          type="source" 
          position={Position.Right}
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900 dark:handle-glow-purple dark:handle-glow-purple-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
      </div>
    </>
  )
}

export default memo(ChatNode)