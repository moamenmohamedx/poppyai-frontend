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

import { memo, useState, useCallback, useEffect, useMemo } from 'react'
import { NodeProps, Handle, Position, useReactFlow } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Sheet, AlertCircle, X, Link as LinkIcon, ChevronDown, ChevronRight, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  const [searchQuery, setSearchQuery] = useState("")
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  // Filtered documents with fuzzy search
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents

    const query = searchQuery.toLowerCase().trim()
    return documents
      .filter(doc => doc.name.toLowerCase().includes(query))
      .sort((a, b) => {
        // Prioritize prefix matches over substring matches
        const aStartsWith = a.name.toLowerCase().startsWith(query)
        const bStartsWith = b.name.toLowerCase().startsWith(query)
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return 0
      })
  }, [documents, searchQuery])

  // Generate preview text with word boundary truncation
  const generatePreview = useCallback((content: string | undefined, type: 'docs' | 'sheets' | null): string => {
    if (!content) return 'No content available'

    if (type === 'docs') {
      // Docs: 250 chars with word boundary
      if (content.length <= 250) return content
      const truncated = content.substring(0, 250)
      const lastSpace = truncated.lastIndexOf(' ')
      return lastSpace > 200 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
    } else if (type === 'sheets') {
      // Sheets: First 5 rows
      const lines = content.split('\n')
      const previewLines = lines.slice(0, 5)
      return previewLines.join('\n') + (lines.length > 5 ? '\n...' : '')
    }

    return content.substring(0, 250) + '...'
  }, [])

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
                <Popover open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCommandOpen}
                      className="nodrag w-full justify-between text-sm"
                    >
                      <span className="text-muted-foreground">Search documents...</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0 nodrag" align="start">
                    <Command className="rounded-md border-0">
                      <CommandInput
                        placeholder="Search documents..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        className="text-sm"
                      />
                      <CommandList className="max-h-60">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                          No documents found
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredDocuments.map((doc) => (
                            <CommandItem
                              key={doc.id}
                              value={doc.id}
                              onSelect={() => {
                                handleDocumentSelect(doc.id)
                                setSearchQuery("")
                                setIsCommandOpen(false)
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {doc.type === 'docs' ? (
                                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <Sheet className="w-4 h-4 text-green-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{doc.name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

                {/* Document Preview */}
                <Collapsible
                  open={isPreviewExpanded}
                  onOpenChange={setIsPreviewExpanded}
                  className="nodrag"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="nodrag w-full justify-between text-xs p-2 h-auto"
                    >
                      <span className="text-muted-foreground">Document Preview</span>
                      {isPreviewExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <div className="rounded-md border border-border p-3 bg-muted/30 max-h-32 overflow-y-auto">
                      {data.documentType === 'docs' ? (
                        <div className="text-xs text-foreground prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {generatePreview(data.content, data.documentType)}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="text-xs text-foreground font-mono whitespace-pre-wrap">
                          {generatePreview(data.content, data.documentType)}
                        </pre>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="nodrag w-full text-xs"
                      onClick={() => setIsPreviewModalOpen(true)}
                    >
                      <Maximize2 className="h-3 w-3 mr-1" />
                      View Full Document
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

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

      {/* Full Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {data.documentType === 'docs' && <FileText className="w-5 h-5 text-blue-500" />}
              {data.documentType === 'sheets' && <Sheet className="w-5 h-5 text-green-500" />}
              {data.documentTitle}
            </DialogTitle>
            <DialogDescription>
              {data.documentType === 'docs' ? 'Google Doc' : 'Google Sheet'} - Full Content
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-muted/30">
            {data.documentType === 'docs' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.content || 'No content available'}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {data.content || 'No content available'}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(GoogleContextNode)
