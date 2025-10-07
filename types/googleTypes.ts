/**
 * Type definitions for Google Docs/Sheets integration
 */

export type GoogleDocType = 'docs' | 'sheets'

export interface GoogleContextNodeData {
  googleLink: string
  documentType: GoogleDocType | null
  documentTitle: string | null
  selectedSheet: string | null  // "All Sheets" or specific sheet name
  availableSheets: string[]
  lastFetched: string | null  // ISO timestamp
  error: string | null
  isLoading: boolean
  [key: string]: any  // Index signature for React Flow compatibility
}

export interface ValidateResponse {
  is_valid: boolean
  type?: GoogleDocType
  document_id?: string
  sheet_id?: string
  error?: string
}

export interface MetadataResponse {
  title: string
  type: GoogleDocType
  sheet_names?: string[]
}

export interface ContentResponse {
  content: string
  format: 'markdown'
}
