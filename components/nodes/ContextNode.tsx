"use client"

import { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Video, Image, Globe, File, X, Upload, Copy, Trash2 } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { toast } from 'sonner'

type ContextType = keyof typeof typeIcons;

const typeIcons = {
  'text': FileText,
  'video': Video,
  'image': Image,
  'website': Globe,
  'document': File,
  'ai-chat': FileText
}

const typeColors = {
  'text': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'video': 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  'image': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'website': 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  'document': 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  'ai-chat': 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
}

function ContextNode({ data, selected }: NodeProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { addContextNode, deleteNode, nodes } = useReactFlowStore()

  const isValidContextType = (type: any): type is ContextType => {
    return type in typeIcons;
  }

  const contextType: ContextType = isValidContextType(data.type) ? data.type : 'text';
  const Icon = typeIcons[contextType] || FileText
  const colorClass = typeColors[contextType] || 'bg-gray-50 text-gray-600'
  
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
      const nodeType = isValidContextType(data.type) ? data.type : 'text'
      addContextNode(nodeType, {
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
        className={`react-flow-node ${selected ? 'ring-2 ring-green-500 dark:ring-cyan-400' : ''}`}
      >
        {/* Connection handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-green-600 dark:!bg-cyan-500 !border-white dark:!border-slate-900 dark:handle-glow-cyan dark:handle-glow-cyan-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
        
        {/* Simple Context Node UI */}
        <Card className="w-[400px] min-h-[280px] bg-white dark:bg-black shadow-lg dark:shadow-[0_0_20px_rgba(34,211,238,0.4)] border border-transparent dark:border-cyan-500/30 transition-all">
          <div className={`flex items-center justify-between p-3 border-b dark:border-b-cyan-500/30 ${colorClass}`}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm capitalize">{contextType} Context</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 dark:hover:bg-white/10 dark:text-cyan-400"
                onClick={() => deleteNode(data.id as string)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 dark:border-cyan-500/30 rounded-lg bg-gray-50 dark:bg-cyan-900/10">
              <Upload className="w-8 h-8 text-gray-400 dark:text-cyan-400/60 mb-2" />
              <p className="text-sm text-gray-600 dark:text-cyan-300 mb-1">Drop {contextType} content here</p>
              <p className="text-xs text-gray-500 dark:text-cyan-400/60">or click to browse</p>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 dark:bg-purple-900/10 rounded-lg dark:border dark:border-purple-500/20">
              <p className="text-xs text-gray-500 dark:text-purple-400/60">Node ID: {data.id as string}</p>
              <p className="text-xs text-gray-500 dark:text-purple-400/60">Type: {contextType}</p>
            </div>
          </div>
        </Card>
        
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-green-600 dark:!bg-cyan-500 !border-white dark:!border-slate-900 dark:handle-glow-cyan dark:handle-glow-cyan-hover"
          style={{ width: '20px', height: '20px' }}
          isConnectable={true}
        />
      </div>
      
      {/* Render context menu with Portal */}
      {contextMenuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-black border border-gray-200 dark:border-cyan-500/30 
                     rounded-lg shadow-lg dark:shadow-[0_0_20px_rgba(34,211,238,0.4)] z-[100] 
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
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-cyan-500/20 
                       dark:text-cyan-300 flex items-center gap-2 transition-colors"
            role="menuitem"
          >
            <Copy className="w-4 h-4" />
            Duplicate
            <span className="ml-auto text-xs opacity-60">Ctrl+C</span>
          </button>
          <div className="border-t border-gray-200 dark:border-cyan-500/20 my-1" />
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

export default memo(ContextNode)