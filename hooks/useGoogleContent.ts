/**
 * React Query hooks for Google Docs/Sheets content
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { 
  GoogleDocType, 
  ValidateResponse, 
  MetadataResponse, 
  ContentResponse 
} from '@/types/googleTypes'
import { 
  validateGoogleLink, 
  getDocumentMetadata, 
  getDocumentContent 
} from '@/lib/api/google'

/**
 * Hook to validate Google Docs/Sheets URL
 */
export function useValidateGoogleLink(
  url: string,
  options?: Omit<UseQueryOptions<ValidateResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ValidateResponse, Error>({
    queryKey: ['google', 'validate', url],
    queryFn: () => validateGoogleLink(url),
    enabled: !!url && url.length > 0,
    retry: 1,
    ...options,
  })
}

/**
 * Hook to fetch document metadata (title and sheet names)
 */
export function useGoogleMetadata(
  url: string,
  type: GoogleDocType,
  options?: Omit<UseQueryOptions<MetadataResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MetadataResponse, Error>({
    queryKey: ['google', 'metadata', url, type],
    queryFn: () => getDocumentMetadata(url, type),
    enabled: !!url && !!type,
    retry: 1,
    ...options,
  })
}

/**
 * Hook to fetch document content as Markdown
 */
export function useGoogleContent(
  url: string,
  type: GoogleDocType,
  sheetName?: string,
  options?: Omit<UseQueryOptions<ContentResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ContentResponse, Error>({
    queryKey: ['google', 'content', url, type, sheetName],
    queryFn: () => getDocumentContent(url, type, sheetName),
    enabled: !!url && !!type,
    retry: 1,
    ...options,
  })
}
