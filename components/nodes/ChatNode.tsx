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
    <div className={`react-flow-node ${selected ? 'ring-2 ring-indigo-500' : ''}`}>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-indigo-600 !border-2 !border-white"
        isConnectable={true}
      />
      
      {/* Simple Chat Node UI */}
      <Card className="w-[400px] min-h-[280px] bg-white shadow-lg">
        <div className="flex items-center justify-between p-3 border-b bg-indigo-50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-sm">Chat Node</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => deleteNode(data.id as string)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">AI Assistant ready to help...</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-sm text-indigo-600">Connect context nodes to provide information</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </Card>
      
      <Handle
        type="source" 
        position={Position.Right}
        className="w-3 h-3 !bg-indigo-600 !border-2 !border-white"
        isConnectable={true}
      />
    </div>
  )
}

export default memo(ChatNode)