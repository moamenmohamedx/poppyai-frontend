"use client"

import { memo } from 'react'
import { NodeProps, Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Video, Image, Globe, File, X, Upload } from 'lucide-react'
import { useReactFlowStore } from '@/stores/useReactFlowStore'

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
  'text': 'bg-blue-50 text-blue-600',
  'video': 'bg-purple-50 text-purple-600',
  'image': 'bg-green-50 text-green-600',
  'website': 'bg-orange-50 text-orange-600',
  'document': 'bg-gray-50 text-gray-600',
  'ai-chat': 'bg-indigo-50 text-indigo-600'
}

function ContextNode({ data, selected }: NodeProps) {
  const { deleteNode } = useReactFlowStore()

  const isValidContextType = (type: any): type is ContextType => {
    return type in typeIcons;
  }

  const contextType: ContextType = isValidContextType(data.type) ? data.type : 'text';
  const Icon = typeIcons[contextType] || FileText
  const colorClass = typeColors[contextType] || 'bg-gray-50 text-gray-600'
  
  return (
    <div className={`react-flow-node ${selected ? 'ring-2 ring-green-500' : ''}`}>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-green-600 !border-2 !border-white" 
        isConnectable={true}
      />
      
      {/* Simple Context Node UI */}
      <Card className="w-[400px] min-h-[280px] bg-white shadow-lg">
        <div className={`flex items-center justify-between p-3 border-b ${colorClass}`}>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-medium text-sm capitalize">{contextType} Context</span>
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
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">Drop {contextType} content here</p>
            <p className="text-xs text-gray-500">or click to browse</p>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Node ID: {data.id as string}</p>
            <p className="text-xs text-gray-500">Type: {contextType}</p>
          </div>
        </div>
      </Card>
      
      <Handle
        type="source"
        position={Position.Right} 
        className="w-3 h-3 !bg-green-600 !border-2 !border-white"
        isConnectable={true}
      />
    </div>
  )
}

export default memo(ContextNode)