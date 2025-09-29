"use client"

import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react'
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
import { Plus, Video, ImageIcon, Globe, File, Copy, Clipboard, Trash2 } from 'lucide-react'
import { useTheme } from 'next-themes'

import ChatNode from './nodes/ChatNode'
import ContextNode from './nodes/ContextNode'
import TextBlockNode from './nodes/TextBlockNode'
import { useReactFlowStore } from '@/stores/useReactFlowStore'

interface ReactFlowCanvasProps {
  projectId: string
}

// Define custom node types - will be updated with context menu handler inside component
const createNodeTypes = (onContextMenu: (event: MouseEvent | React.MouseEvent) => void) => ({
  chatNode: (props: any) => <ChatNode {...props} onNodeContextMenu={onContextMenu} />,
  contextNode: (props: any) => <ContextNode {...props} onNodeContextMenu={onContextMenu} />,
  textBlockNode: (props: any) => <TextBlockNode {...props} onNodeContextMenu={onContextMenu} />,
})

function ReactFlowCanvasInner({ projectId }: ReactFlowCanvasProps) {
  const { 
    nodes, 
    edges, 
    viewport,
    addChatNode, 
    addContextNode,
    addTextBlockNode,
    deleteNode,
    setNodes,
    setEdges,
    setViewport,
    onConnect,
    resetCanvas,
    copyNodes,
    pasteNodes,
    deleteSelectedNodes
  } = useReactFlowStore()

  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [lastRightClickPosition, setLastRightClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuScreenPosition, setContextMenuScreenPosition] = useState<{ x: number; y: number } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, setViewport: rfSetViewport } = useReactFlow() // Use the useReactFlow hook
  const { theme, systemTheme } = useTheme()
  const currentTheme = theme === 'system' ? systemTheme : theme
  
  // Sync viewport on mount
  useEffect(() => {
    if (viewport) {
      rfSetViewport(viewport)
    }
  }, []) // Only on mount

  // Hide context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false)
    }

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('contextmenu', handleClickOutside)
      }
    }
  }, [showContextMenu])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Copy: Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        const selectedNodes = nodes.filter(node => node.selected)
        if (selectedNodes.length > 0) {
          copyNodes(selectedNodes)
        }
      }
      
      // Paste: Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        // Use last right-click position or center of viewport
        const position = lastRightClickPosition || screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        })
        pasteNodes(position)
      }
      
      // Delete: Delete
      if (e.key === 'Delete') {
        e.preventDefault()
        deleteSelectedNodes()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nodes, lastRightClickPosition, screenToFlowPosition, copyNodes, pasteNodes, deleteSelectedNodes])


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

  // Connection handling is now done by the store's onConnect method

  // Connection validation
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    return (sourceNode?.type === 'contextNode' || sourceNode?.type === 'textBlockNode') && targetNode?.type === 'chatNode'
  }, [nodes])

  // Add node at center of viewport
  const addNodeAtCenter = useCallback((type: 'chat' | 'context' | 'textBlock', contextType?: string) => {
    const bounds = reactFlowWrapper.current?.getBoundingClientRect()
    if (!bounds) return

    try {
      const position = screenToFlowPosition({
        x: bounds.width / 2 - 200,
        y: bounds.height / 2 - 140
      })

      if (type === 'chat') {
        addChatNode(position)
      } else if (type === 'textBlock') {
        addTextBlockNode(position)
      } else {
        addContextNode(contextType as any, position)
      }
    } catch (error) {
      // Fallback to default position if project fails
      const fallbackPosition = { x: 250, y: 150 }
      if (type === 'chat') {
        addChatNode(fallbackPosition)
      } else if (type === 'textBlock') {
        addTextBlockNode(fallbackPosition)
      } else {
        addContextNode(contextType as any, fallbackPosition)
      }
    }
  }, [screenToFlowPosition, addChatNode, addContextNode, addTextBlockNode])

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

  
  // Handle viewport changes
  const handleViewportChange = useCallback((newViewport: Viewport) => {
    setViewport(newViewport)
  }, [setViewport])

  // Handle context menu (works for both pane and nodes)
  const handleContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const flowPosition = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    })
    setContextMenuPosition(flowPosition)
    setLastRightClickPosition(flowPosition)
    
    // Show custom context menu at screen position
    setContextMenuScreenPosition({ x: event.clientX, y: event.clientY })
    setShowContextMenu(true)
  }, [screenToFlowPosition])

  // Handle context menu for pane (empty canvas areas)
  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    handleContextMenu(event)
  }, [handleContextMenu])

  // Handle context menu for nodes
  const handleNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    handleContextMenu(event)
  }, [handleContextMenu])

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected)
    if (selectedNodes.length > 0) {
      copyNodes(selectedNodes)
    }
    setShowContextMenu(false)
  }, [nodes, copyNodes])

  const handlePaste = useCallback(() => {
    const position = lastRightClickPosition || screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    })
    pasteNodes(position)
    setShowContextMenu(false)
  }, [lastRightClickPosition, screenToFlowPosition, pasteNodes])

  const handleDelete = useCallback(() => {
    deleteSelectedNodes()
    setShowContextMenu(false)
  }, [deleteSelectedNodes])

  // Create node types with context menu handler
  const nodeTypes = useMemo(() => createNodeTypes(handleNodeContextMenu), [handleNodeContextMenu])

  return (
    <div 
      className="w-full h-full" 
      ref={reactFlowWrapper}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onViewportChange={handleViewportChange}
        onPaneContextMenu={handlePaneContextMenu}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView={false}
        className="dark:bg-black"
        style={{ backgroundColor: currentTheme === 'dark' ? undefined : 'hsl(214.3, 31.8%, 91.4%)' }}
        deleteKeyCode={["Delete"]}
        multiSelectionKeyCode={["Meta", "Ctrl"]}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        snapToGrid
        snapGrid={[20, 20]}
        colorMode={currentTheme === 'dark' ? 'dark' : 'light'}
      >
        <Background 
          gap={20}
          size={1}
          color="#d1d5db"
          className="dark:bg-pattern-black"
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
            return node.type === 'chatNode' ? '#a855f7' : '#22d3ee'
          }}
          pannable
          zoomable
          className="dark:!bg-black/80 dark:!border-purple-500/30"
        />


        {/* Status Panel */}
        <Panel position="top-left">
          <div className="bg-white dark:bg-black/80 px-3 py-2 rounded-lg shadow-md dark:shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-gray-200 dark:border-purple-500/30">
            <div className="text-sm font-medium text-green-600 dark:text-cyan-400">
              ✓ React Flow Canvas
            </div>
            <div className="text-xs text-gray-500 dark:text-purple-400/60 mt-1">
              Nodes: {nodes.length} | Edges: {edges.length}
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* File Drop Overlay */}
      {isDragOverCanvas && (
        <div className="absolute inset-0 bg-indigo-500 dark:bg-purple-500 bg-opacity-10 dark:bg-opacity-20 border-4 border-dashed border-indigo-500 dark:border-purple-500 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white dark:bg-black/90 rounded-xl p-8 shadow-lg dark:shadow-[0_0_30px_rgba(168,85,247,0.5)] text-center dark:border dark:border-purple-500/30">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4 dark:border dark:border-purple-500/30">
              <Plus className="w-8 h-8 text-indigo-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Drop files to create nodes</h3>
            <p className="text-gray-600 dark:text-purple-300/70">Images, videos, and documents will become context nodes</p>
          </div>
        </div>
      )}

      {/* Custom Context Menu */}
      {showContextMenu && contextMenuScreenPosition && (
        <div
          className="fixed bg-white dark:bg-black border border-gray-200 dark:border-purple-500/30 
                     rounded-lg shadow-lg dark:shadow-[0_0_20px_rgba(168,85,247,0.4)] z-[1000] 
                     py-1 min-w-[160px] animate-in fade-in duration-200"
          style={{
            left: `${Math.min(contextMenuScreenPosition.x, window.innerWidth - 160)}px`,
            top: `${Math.min(contextMenuScreenPosition.y, window.innerHeight - 120)}px`,
            transformOrigin: 'top left'
          }}
          role="menu"
          aria-label="Canvas context menu"
        >
          <button
            onClick={handleCopy}
            disabled={nodes.filter(n => n.selected).length === 0}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-purple-500/20 
                       dark:text-purple-300 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
          >
            <Copy className="w-4 h-4" />
            Copy
            <span className="ml-auto text-xs opacity-60">Ctrl+C</span>
          </button>
          <button
            onClick={handlePaste}
            className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-purple-500/20 
                       dark:text-purple-300 flex items-center gap-2 transition-colors"
            role="menuitem"
          >
            <Clipboard className="w-4 h-4" />
            Paste
            <span className="ml-auto text-xs opacity-60">Ctrl+V</span>
          </button>
          <div className="border-t border-gray-200 dark:border-purple-500/20 my-1" />
          <button
            onClick={handleDelete}
            disabled={nodes.filter(n => n.selected).length === 0}
            className="w-full px-3 py-2 text-sm text-left hover:bg-red-50 dark:hover:bg-red-500/20 
                       text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            role="menuitem"
          >
            <Trash2 className="w-4 h-4" />
            Delete
            <span className="ml-auto text-xs opacity-60">Del</span>
          </button>
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
