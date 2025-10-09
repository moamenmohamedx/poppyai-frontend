"use client"

/**
 * GoogleContextNode - OAuth 2.0 enabled Google Drive integration
 *
 * UI Flow:
 * 1. Connect Button → initiateGoogleOAuth()
 * 2. OAuth popup → User authorizes
 * 3. Fetching Documents → fetchUserDocuments()
 * 4. Document Picker Dropdown → User selects
 * 5. Loading Content → fetchDocumentContentById()
 * 6. Success → Content stored in node.data.content
 */

import { memo, useState, useCallback, useEffect } from 'react'
import { NodeProps, Handle, Position, useReactFlow } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Sheet, AlertCircle, X, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  initiateGoogleOAuth,
  fetchUserDocuments,
  fetchDocumentContentById,
  checkGoogleAuth,
  GoogleDocument,
} from '@/lib/google-oauth'
import { GoogleContextNodeData } from '@/types/googleTypes'

interface GoogleContextNodeProps extends NodeProps {
  data: GoogleContextNodeData
  onNodeContextMenu?: (event: React.MouseEvent) => void
}

function GoogleContextNode({ id, data, selected, onNodeContextMenu }: GoogleContextNodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const [documents, setDocuments] = useState<GoogleDocument[]>([])

  // Handle OAuth connection
  const handleConnect = useCallback(async () => {
    updateNodeData(id, { isLoading: true, error: null })

    try {
      // NEW: Check OAuth status first
      // CRITICAL: Wrap in try-catch to handle checkGoogleAuth() failures gracefully
      let isAuthenticated = false
      try {
        const status = await checkGoogleAuth()
        isAuthenticated = status.is_authenticated
      } catch (statusError) {
        // If status check fails (network error, backend down), assume NOT authenticated
        // This ensures we still show OAuth popup to user rather than failing silently
        console.warn('OAuth status check failed, assuming not authenticated:', statusError)
        isAuthenticated = false
      }

      if (!isAuthenticated) {
        // User NOT authenticated → open OAuth popup
        await initiateGoogleOAuth()

        // Small delay to ensure tokens are committed to database
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      // else: User already authenticated → skip OAuth, proceed to fetch

      // Mark as fetching documents
      updateNodeData(id, { isFetchingDocuments: true })

      // Fetch user's documents (this call already handles authentication)
      const docs = await fetchUserDocuments()
      setDocuments(docs)

      updateNodeData(id, {
        isLoading: false,
        isFetchingDocuments: false,
      })

      toast.success('Connected to Google Drive successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect'

      // Handle specific errors
      if (errorMessage === 'NOT_AUTHENTICATED_WITH_GOOGLE') {
        updateNodeData(id, {
          error: 'Not authenticated with Google. Please try connecting again.',
          isLoading: false,
          isFetchingDocuments: false,
        })
      } else if (errorMessage === 'OAuth cancelled') {
        updateNodeData(id, {
          error: null, // Don't show error for user cancellation
          isLoading: false,
          isFetchingDocuments: false,
        })
        toast.info('OAuth cancelled')
      } else {
        updateNodeData(id, {
          error: errorMessage,
          isLoading: false,
          isFetchingDocuments: false,
        })
        toast.error(errorMessage)
      }
    }
  }, [id, updateNodeData])

  // Handle document selection
  const handleDocumentSelect = useCallback(async (documentId: string) => {
    const selectedDoc = documents.find(doc => doc.id === documentId)
    if (!selectedDoc) return

    updateNodeData(id, { isLoading: true, error: null })

    try {
      // Fetch document content
      const { content, sheet_names } = await fetchDocumentContentById(
        documentId,
        selectedDoc.type
      )

      // Update node with full data
      updateNodeData(id, {
        documentId: selectedDoc.id,
        documentTitle: selectedDoc.name,
        documentType: selectedDoc.type,
        mimeType: selectedDoc.mimeType,
        content,
        availableSheets: sheet_names || [],
        selectedSheet: sheet_names ? 'All Sheets' : null,
        lastFetched: new Date().toISOString(),
        isLoading: false,
        error: null,
      })

      toast.success(`Loaded: ${selectedDoc.name}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch content'
      updateNodeData(id, {
        error: errorMessage,
        isLoading: false,
      })
      toast.error(errorMessage)
    }
  }, [documents, id, updateNodeData])

  // Handle sheet selection (for Sheets documents)
  const handleSheetChange = useCallback(async (value: string) => {
    updateNodeData(id, { selectedSheet: value, isLoading: true })

    try {
      // Re-fetch content with specific sheet
      if (data.documentId && data.documentType) {
        const { content } = await fetchDocumentContentById(
          data.documentId,
          data.documentType
        )

        updateNodeData(id, {
          content,
          selectedSheet: value,
          lastFetched: new Date().toISOString(),
          isLoading: false,
        })
      }
    } catch (error) {
      updateNodeData(id, { isLoading: false })
      toast.error('Failed to fetch sheet content')
    }
  }, [id, data.documentId, data.documentType, updateNodeData])

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
    toast.success('Google context node deleted')
  }, [id, deleteElements])

  // Handle try again
  const handleTryAgain = useCallback(() => {
    setDocuments([])
    updateNodeData(id, {
      documentId: undefined,
      documentTitle: null,
      documentType: null,
      mimeType: undefined,
      content: undefined,
      selectedSheet: null,
      availableSheets: [],
      error: null,
      isLoading: false,
      isFetchingDocuments: false,
    })
  }, [id, updateNodeData])

  // Handle change document (preserves documents array for faster document switching)
  const handleChangeDocument = useCallback(() => {
    // IMPORTANT: Do NOT clear the documents array (preserves cached document list)
    updateNodeData(id, {
      documentId: undefined,
      documentTitle: null,
      documentType: null,
      mimeType: undefined,
      content: undefined,
      selectedSheet: null,
      availableSheets: [],
      lastFetched: null,
      error: null,
      isLoading: false,
      isFetchingDocuments: false,
    })
  }, [id, updateNodeData])

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
  }, [selected, handleDelete])

  const isLoading = data.isLoading || data.isFetchingDocuments

  return (
    <>
      <div 
        className="react-flow-node"
        onContextMenu={onNodeContextMenu}
      >
        <Card
          className={`w-[400px] h-[320px] shadow-lg border-2 border-border bg-white dark:bg-slate-800 ${
            selected ? 'ring-2 ring-yellow-500 dark:ring-yellow-400' : ''
          }`}
        >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {data.documentType === 'docs' && <FileText className="w-5 h-5 text-blue-500" />}
              {data.documentType === 'sheets' && <Sheet className="w-5 h-5 text-green-500" />}
              {!data.documentType && <LinkIcon className="w-5 h-5 text-yellow-500" />}
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Google Drive
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 nodrag"
              onClick={handleDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Initial State - Connect Button */}
            {!data.documentId && documents.length === 0 && !isLoading && !data.error && (
              <div className="flex items-center justify-center flex-1">
                <Button
                  onClick={handleConnect}
                  className="nodrag"
                  variant="outline"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Connect Google Drive
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    {data.isFetchingDocuments ? 'Fetching documents...' : 'Loading content...'}
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {data.error && !isLoading && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{data.error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="nodrag w-full"
                  onClick={handleTryAgain}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Document Picker State */}
            {!data.documentId && !isLoading && !data.error && documents.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Select Document:</label>
                <Select onValueChange={handleDocumentSelect}>
                  <SelectTrigger className="nodrag text-sm">
                    <SelectValue placeholder="Choose a document..." />
                  </SelectTrigger>
                  <SelectContent className="nodrag max-h-60">
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          {doc.type === 'docs' ? (
                            <FileText className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Sheet className="w-4 h-4 text-green-500" />
                          )}
                          <span className="truncate">{doc.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} available
                </p>
              </div>
            )}

            {/* Success State */}
            {data.documentTitle && data.content && !isLoading && !data.error && (
              <div className="space-y-3">
                {/* Document Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {data.documentTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.documentType === 'docs' ? 'Google Doc' : 'Google Sheet'}
                  </p>
                </div>

                {/* Sheet Selector (only for Sheets) */}
                {data.documentType === 'sheets' && data.availableSheets && data.availableSheets.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Select Sheet:</label>
                    <Select
                      value={data.selectedSheet || 'All Sheets'}
                      onValueChange={handleSheetChange}
                    >
                      <SelectTrigger className="nodrag text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="nodrag">
                        <SelectItem value="All Sheets">All Sheets</SelectItem>
                        {data.availableSheets.map((sheet) => (
                          <SelectItem key={sheet} value={sheet}>
                            {sheet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {data.lastFetched && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(data.lastFetched).toLocaleTimeString()}
                  </p>
                )}

                {/* Change Document Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="nodrag w-full text-xs"
                  onClick={handleChangeDocument}
                >
                  Change Document
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

        {/* Connection Handle */}
        <Handle
          id="google-source"
          type="source"
          position={Position.Right}
          className="!bg-primary !border-white dark:!border-slate-900"
          style={{ width: '16px', height: '16px' }}
          isConnectable={true}
        />
      </div>
    </>
  )
}

export default memo(GoogleContextNode)
