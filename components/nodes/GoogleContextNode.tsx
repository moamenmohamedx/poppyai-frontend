"use client"

import { memo, useState, useCallback, useEffect } from 'react'
import { NodeProps, Handle, Position, useReactFlow } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Sheet, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { useGoogleMetadata } from '@/hooks/useGoogleContent'
import { validateGoogleLink } from '@/lib/api/google'
import { GoogleContextNodeData, GoogleDocType } from '@/types/googleTypes'

interface GoogleContextNodeProps extends NodeProps {
  data: GoogleContextNodeData
}

function GoogleContextNode({ id, data, selected }: GoogleContextNodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const [localLink, setLocalLink] = useState(data.googleLink || '')
  const [isValidating, setIsValidating] = useState(false)

  // Fetch metadata when link is validated
  const { data: metadata, isLoading: isLoadingMeta, error: metadataError } = useGoogleMetadata(
    data.googleLink,
    data.documentType || 'docs',
    { enabled: !!data.googleLink && !!data.documentType }
  )

  // Update node data when metadata is fetched
  useEffect(() => {
    if (metadata && !data.documentTitle) {
      updateNodeData(id, {
        documentTitle: metadata.title,
        availableSheets: metadata.sheet_names || [],
        selectedSheet: metadata.sheet_names ? 'All Sheets' : null,
        error: null,
        isLoading: false,
      })
    }
  }, [metadata, id, data.documentTitle, updateNodeData])

  // Handle metadata error
  useEffect(() => {
    if (metadataError) {
      updateNodeData(id, {
        error: metadataError.message || 'Failed to fetch document metadata',
        isLoading: false,
      })
    }
  }, [metadataError, id, updateNodeData])

  // Handle link validation on blur
  const handleLinkBlur = useCallback(async () => {
    if (!localLink || localLink === data.googleLink) return

    setIsValidating(true)
    updateNodeData(id, { isLoading: true, error: null })

    try {
      const result = await validateGoogleLink(localLink)

      if (result.is_valid && result.type) {
        updateNodeData(id, {
          googleLink: localLink,
          documentType: result.type as GoogleDocType,
          isLoading: true, // Keep loading until metadata is fetched
          error: null,
        })
        toast.success('Google link validated successfully')
      } else {
        updateNodeData(id, {
          error: result.error || 'Invalid Google Docs or Sheets URL',
          isLoading: false,
        })
        toast.error('Invalid Google link')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate link'
      updateNodeData(id, {
        error: errorMessage,
        isLoading: false,
      })
      toast.error(errorMessage)
    } finally {
      setIsValidating(false)
    }
  }, [localLink, data.googleLink, id, updateNodeData])

  // Handle sheet selection
  const handleSheetChange = useCallback((value: string) => {
    updateNodeData(id, { selectedSheet: value })
  }, [id, updateNodeData])

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
    toast.success('Google context node deleted')
  }, [id, deleteElements])

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

  // Handle Try Again
  const handleTryAgain = useCallback(() => {
    setLocalLink('')
    updateNodeData(id, {
      googleLink: '',
      documentType: null,
      error: null,
      documentTitle: null,
      availableSheets: [],
      selectedSheet: null,
      isLoading: false,
    })
  }, [id, updateNodeData])

  const isLoading = data.isLoading || isLoadingMeta || isValidating

  return (
    <div>
      <Card
        className="w-[400px] h-[280px] shadow-lg border-2 border-border bg-white dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {data.documentType === 'docs' && <FileText className="w-5 h-5 text-blue-500" />}
              {data.documentType === 'sheets' && <Sheet className="w-5 h-5 text-green-500" />}
              {!data.documentType && <FileText className="w-5 h-5 text-gray-400" />}
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Google Context
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
            {/* Initial State - Link Input */}
            {!data.documentType && !isLoading && (
              <div className="space-y-2">
                <Input
                  className="nodrag text-sm"
                  placeholder="Paste Google Docs or Sheets link..."
                  value={localLink}
                  onChange={(e) => setLocalLink(e.target.value)}
                  onBlur={handleLinkBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Ensure the link is publicly viewable or shared
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    {isValidating ? 'Validating...' : 'Loading metadata...'}
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

            {/* Success State */}
            {data.documentTitle && !isLoading && !data.error && (
              <div className="space-y-3">
                {/* Document Info */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {data.documentTitle}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {data.googleLink}
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
  )
}

export default memo(GoogleContextNode)
