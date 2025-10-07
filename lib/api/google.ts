/**
 * Google Docs/Sheets API client
 */

import { GoogleDocType, ValidateResponse, MetadataResponse, ContentResponse } from '@/types/googleTypes'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Validate Google Docs/Sheets URL
 */
export async function validateGoogleLink(url: string): Promise<ValidateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/google/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to validate URL')
    }

    return await response.json()
  } catch (error) {
    console.error('Error validating Google link:', error)
    throw error
  }
}

/**
 * Get document metadata (title and sheet names)
 */
export async function getDocumentMetadata(
  url: string,
  type: GoogleDocType
): Promise<MetadataResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/google/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch metadata')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching metadata:', error)
    throw error
  }
}

/**
 * Get document content as Markdown
 */
export async function getDocumentContent(
  url: string,
  type: GoogleDocType,
  sheetName?: string
): Promise<ContentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/google/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url, 
        type, 
        sheet_name: sheetName 
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to fetch content')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching content:', error)
    throw error
  }
}
