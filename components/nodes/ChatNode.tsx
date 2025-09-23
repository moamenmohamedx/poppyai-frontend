"use client"

import { memo } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'

function ChatNode({ data, selected }: NodeProps) {
  const { deleteNode } = useReactFlowStore()
  
  return (
    <div className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500 dark:ring-purple-400' : ''}`}>
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
  )
}

export default memo(ChatNode)