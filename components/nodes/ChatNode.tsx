"use client"

import { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Copy, Trash2 } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { toast } from 'sonner'

function ChatNode({ data, selected }: NodeProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { addChatNode, deleteNode, nodes } = useReactFlowStore()
  
  // Click outside & keyboard handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPosition(null)
      }
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected) {
        if (e.key === 'Delete') {
          e.preventDefault()
          handleDelete()
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault()
          handleCopy()
        }
      }
    }
    
    if (contextMenuPosition) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [contextMenuPosition, selected])
  
  // Enhanced handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Calculate safe position
    const menuWidth = 160
    const menuHeight = 80
    const padding = 8
    
    let x = e.clientX
    let y = e.clientY
    
    // Keep menu on screen
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding
    }
    if (y + menuHeight > window.innerHeight - padding) {
      y = window.innerHeight - menuHeight - padding
    }
    
    setContextMenuPosition({ x, y })
  }
  
  const handleCopy = () => {
    const currentNode = nodes.find(n => n.id === data.id)
    if (currentNode) {
      addChatNode({
        x: currentNode.position.x + 20,
        y: currentNode.position.y + 20
      })
    }
    setContextMenuPosition(null)
    toast.success('Node duplicated')
  }
  
  const handleDelete = () => {
    deleteNode(data.id as string)
    setContextMenuPosition(null)
    toast.success('Node deleted')
  }
  
  return (
    <>
      <div 
        onContextMenu={handleContextMenu}
        className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-indigo-600 dark:!bg-purple-500 !border-2 !border-white dark:!border-black"
          isConnectable={true}
        />
        
        {/* Simple Chat Node UI */}
        <Card className="w-[400px] min-h-[280px] bg-white dark:bg-black shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-transparent dark:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between p-3 border-b bg-indigo-50 dark:bg-purple-900/30 dark:border-purple-500/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-purple-400" />
              <span className="font-medium text-sm dark:text-purple-300">Chat Node</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 dark:hover:bg-white/10 dark:text-purple-400"
                onClick={() => deleteNode(data.id as string)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              <div className="bg-gray-50 dark:bg-purple-900/20 rounded-lg p-3 dark:border dark:border-purple-500/20">
                <p className="text-sm text-gray-600 dark:text-purple-300/80">AI Assistant ready to help...</p>
              </div>
              <div className="bg-indigo-50 dark:bg-cyan-900/20 rounded-lg p-3 dark:border dark:border-cyan-500/20">
                <p className="text-sm text-indigo-600 dark:text-cyan-400">Connect context nodes to provide information</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-black/50 dark:border-purple-500/30 dark:text-purple-200 dark:placeholder-purple-400/50 dark:focus:ring-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </Card>
        
        <Handle
          type="source" 
          position={Position.Right}
          className="w-3 h-3 !bg-indigo-600 dark:!bg-purple-500 !border-2 !border-white dark:!border-black"
          isConnectable={true}
        />
      </div>
      
      {/* Render context menu with Portal */}
      {contextMenuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-black border border-gray-200 dark:border-purple-500/30 
                     rounded-lg shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] z-[100] 
                     py-1 min-w-[160px] animate-in fade-in duration-200"
          style={{ 
            left: `${contextMenuPosition.x}px`, 
            top: `${contextMenuPosition.y}px`,
            transformOrigin: 'top left'
          }}
          role="menu"
          aria-label="Node context menu"
        >
          <button
            onClick={handleCopy}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-purple-500/20 
                       dark:text-purple-300 flex items-center gap-2 transition-colors"
            role="menuitem"
          >
            <Copy className="w-4 h-4" />
            Duplicate
            <span className="ml-auto text-xs opacity-60">Ctrl+C</span>
          </button>
          <div className="border-t border-gray-200 dark:border-purple-500/20 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-500/20 
                       text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors"
            role="menuitem"
          >
            <Trash2 className="w-4 h-4" />
            Delete
            <span className="ml-auto text-xs opacity-60">Del</span>
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

export default memo(ChatNode)