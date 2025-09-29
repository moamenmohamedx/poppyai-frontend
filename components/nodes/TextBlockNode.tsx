"use client"

import { memo, useState, useEffect } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { X, Type } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { toast } from 'sonner'

interface TextBlockNodeProps extends NodeProps {
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function TextBlockNode({ data, selected, onNodeContextMenu }: TextBlockNodeProps) {
  const [primaryText, setPrimaryText] = useState((data as any).primaryText || '')
  const [notesText, setNotesText] = useState((data as any).notesText || '')
  const { deleteNode, updateNode } = useReactFlowStore()
  
  // Keyboard handler for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selected && e.key === 'Delete') {
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
    toast.success('Text block deleted')
  }

  const handlePrimaryTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setPrimaryText(newText)
    updateNode(data.id as string, { 
      data: { ...data, primaryText: newText } 
    })
  }

  const handleNotesTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setNotesText(newText)
    updateNode(data.id as string, { 
      data: { ...data, notesText: newText } 
    })
  }
  
  return (
    <>
      <div 
        className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}
        onContextMenu={onNodeContextMenu}
      >
        {/* Connection handles */}
        
        {/* Text Block Node UI */}
        <Card className="w-[400px] h-[320px] bg-white dark:bg-slate-800 shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-gray-200 dark:border-purple-500/30 transition-all overflow-hidden gap-3 py-3">
          {/* Header with blue border */}
          <div className="border-t-4 border-indigo-600 dark:border-purple-500 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-600 dark:bg-purple-500 flex items-center justify-center">
                  <Type className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-sm text-gray-800 dark:text-purple-300">Text</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-purple-800/50 rounded"
                onClick={handleDelete}
              >
                <X className="w-3.5 h-3.5 text-gray-600 dark:text-purple-400" />
              </Button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="px-1 pb-1 flex flex-col gap-1 h-[calc(100%-52px)]">
            {/* Primary Text Input - Larger */}
            <div className="flex-1">
              <Textarea
                value={primaryText}
                onChange={handlePrimaryTextChange}
                placeholder="Enter text or type '/' for commands"
                className="h-full resize-none bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Secondary Notes Input - Smaller */}
            <div className="h-12">
              <Textarea
                value={notesText}
                onChange={handleNotesTextChange}
                placeholder="Add notes for AI to use..."
                className="h-full resize-none bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-600 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </Card>
        
        <Handle
          type="source" 
          position={Position.Right}
          className="!bg-indigo-600 dark:!bg-purple-500 !border-white dark:!border-slate-900"
          style={{ width: '16px', height: '16px' }}
          isConnectable={true}
        />
      </div>
    </>
  )
}

export default memo(TextBlockNode)
