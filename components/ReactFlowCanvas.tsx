"use client"

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel,
  NodeChange,
  EdgeChange,
  useReactFlow,
  Viewport
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare, FileText, Video, ImageIcon, Globe, File, RotateCcw, Trash2 } from 'lucide-react'

import ChatNode from './nodes/ChatNode'
import ContextNode from './nodes/ContextNode'
import { useReactFlowStore } from '@/stores/useReactFlowStore'

interface ReactFlowCanvasProps {
  projectId: string
}

// Define custom node types
const nodeTypes = {
  chatNode: ChatNode,
  contextNode: ContextNode,
}

function ReactFlowCanvasInner({ projectId }: ReactFlowCanvasProps) {
  const { 
    nodes, 
    edges, 
    viewport,
    addChatNode, 
    addContextNode,
    deleteNode,
    setNodes,
    setEdges,
    setViewport,
    onConnect,
    resetCanvas
  } = useReactFlowStore()

  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, setViewport: rfSetViewport } = useReactFlow() // Use the useReactFlow hook
  
  // Sync viewport on mount
  useEffect(() => {
    if (viewport) {
      rfSetViewport(viewport)
    }
  }, []) // Only on mount


  // Handle node changes directly in the store
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes)
    setNodes(updatedNodes)
  }, [nodes, setNodes])

  // Handle edge changes directly in the store
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, edges)
    setEdges(updatedEdges)
  }, [edges, setEdges])

  // Handle new connections with store sync
  const handleConnect = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    // Validate connection: only context → chat
    if (sourceNode?.type === 'contextNode' && targetNode?.type === 'chatNode') {
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#6366f1',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        }
      }
      
      const updatedEdges = addEdge(newEdge, edges)
      setEdges(updatedEdges)
    }
  }, [nodes, edges, setEdges])

  // Connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    return sourceNode?.type === 'contextNode' && targetNode?.type === 'chatNode'
  }, [nodes])

  // Add node at center of viewport
  const addNodeAtCenter = useCallback((type: 'chat' | 'context', contextType?: string) => {
    const bounds = reactFlowWrapper.current?.getBoundingClientRect()
    if (!bounds) return

    try {
      const position = screenToFlowPosition({
        x: bounds.width / 2 - 200,
        y: bounds.height / 2 - 140
      })

      if (type === 'chat') {
        addChatNode(position)
      } else {
        addContextNode(contextType as any, position)
      }
    } catch (error) {
      // Fallback to default position if project fails
      const fallbackPosition = { x: 250, y: 150 }
      if (type === 'chat') {
        addChatNode(fallbackPosition)
      } else {
        addContextNode(contextType as any, fallbackPosition)
      }
    }
  }, [screenToFlowPosition, addChatNode, addContextNode])

  // Handle file drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOverCanvas(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!reactFlowWrapper.current?.contains(e.relatedTarget as Element)) {
      setIsDragOverCanvas(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOverCanvas(false)

    if (!reactFlowWrapper.current) return

    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    
    try {
      const position = screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top
      })

      const files = Array.from(e.dataTransfer.files)
      files.forEach(file => {
        let contextType: string = 'document'
        
        if (file.type.startsWith('image/')) contextType = 'image'
        else if (file.type.startsWith('video/')) contextType = 'video'
        else if (file.type === 'text/plain') contextType = 'text'

        addContextNode(contextType as any, position)
      })
    } catch (error) {
      // Fallback to default position if project fails
      const files = Array.from(e.dataTransfer.files)
      files.forEach((file, index) => {
        let contextType: string = 'document'
        
        if (file.type.startsWith('image/')) contextType = 'image'
        else if (file.type.startsWith('video/')) contextType = 'video'
        else if (file.type === 'text/plain') contextType = 'text'

        addContextNode(contextType as any, { x: 100 + index * 50, y: 100 + index * 50 })
      })
    }
  }, [screenToFlowPosition, addContextNode])

  // Delete selected nodes
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected)
    selectedNodes.forEach(node => deleteNode(node.id))
  }, [nodes, deleteNode])
  
  // Handle viewport changes
  const handleViewportChange = useCallback((newViewport: Viewport) => {
    setViewport(newViewport)
  }, [setViewport])

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onViewportChange={handleViewportChange}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView={false}
        className="bg-gray-50"
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        snapToGrid
        snapGrid={[20, 20]}
      >
        <Background 
          gap={20}
          size={1}
          color="#d1d5db"
        />
        
        <Controls 
          position="bottom-left"
          showZoom
          showFitView
          showInteractive
        />
        
        <MiniMap 
          position="bottom-right"
          nodeColor={(node) => {
            return node.type === 'chatNode' ? '#6366f1' : '#10b981'
          }}
          pannable
          zoomable
        />

        {/* Canvas Actions Panel - Top Right */}
        <Panel position="top-right" className="space-y-2">
          <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
            <div className="flex flex-col space-y-2">
              {/* Add Nodes Row */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => addNodeAtCenter('chat')}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Add Chat
                </Button>
                
                <Button
                  onClick={() => addNodeAtCenter('context', 'text')}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Add Context
                </Button>
              </div>
              
              {/* Action Row */}
              <div className="flex space-x-2">
                <Button
                  onClick={resetCanvas}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                
                <Button
                  onClick={handleDeleteSelected}
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        {/* Status Panel */}
        <Panel position="top-left">
          <div className="bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200">
            <div className="text-sm font-medium text-green-600">
              ✓ React Flow Canvas
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Nodes: {nodes.length} | Edges: {edges.length}
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* File Drop Overlay */}
      {isDragOverCanvas && (
        <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 border-4 border-dashed border-indigo-500 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-xl p-8 shadow-lg text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop files to create nodes</h3>
            <p className="text-gray-600">Images, videos, and documents will become context nodes</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
