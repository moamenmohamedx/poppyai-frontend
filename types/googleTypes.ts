/**
 * Type definitions for Google Docs/Sheets integration (OAuth only)
 */

export type GoogleDocType = 'docs' | 'sheets'

export interface GoogleContextNodeData {
  // OAuth-based fields
  documentId?: string           // Google file ID
  mimeType?: string            // Google MIME type
  content?: string             // Pre-fetched Markdown content

  // Common fields
  documentType: GoogleDocType | null
  documentTitle: string | null
  selectedSheet: string | null  // "All Sheets" or specific sheet name
  availableSheets: string[]
  lastFetched: string | null  // ISO timestamp
  error: string | null
  isLoading: boolean
  isFetchingDocuments?: boolean // Loading documents list

  [key: string]: any  // Index signature for React Flow compatibility
}
