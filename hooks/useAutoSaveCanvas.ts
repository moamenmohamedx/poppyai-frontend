import { useEffect, useCallback, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useReactFlowStore } from '@/stores/useReactFlowStore'
import { saveCanvasState } from '@/lib/supabase/projects'
import { toast } from 'sonner'

interface UseAutoSaveCanvasOptions {
  projectId: string | null
  enabled?: boolean
  debounceMs?: number
  onSaveStart?: () => void
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useAutoSaveCanvas({
  projectId,
  enabled = true,
  debounceMs = 2000,
  onSaveStart,
  onSaveSuccess,
  onSaveError
}: UseAutoSaveCanvasOptions) {
  const saveInProgressRef = useRef(false)
  
  // Subscribe to store changes
  const nodes = useReactFlowStore(state => state.nodes)
  const edges = useReactFlowStore(state => state.edges)
  const viewport = useReactFlowStore(state => state.viewport)
  
  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!projectId || !enabled || saveInProgressRef.current) return
      
      try {
        saveInProgressRef.current = true
        onSaveStart?.()
        
        await saveCanvasState(projectId, nodes, edges, viewport)
        
        onSaveSuccess?.()
      } catch (error) {
        console.error('Auto-save failed:', error)
        onSaveError?.(error as Error)
        toast.error('Failed to save canvas')
      } finally {
        saveInProgressRef.current = false
      }
    },
    debounceMs
  )
  
  // Trigger save on changes
  useEffect(() => {
    if (!projectId || !enabled) return
    
    debouncedSave()
  }, [nodes, edges, viewport, projectId, enabled, debouncedSave])
  
  // Manual save function
  const saveNow = useCallback(async () => {
    if (!projectId || saveInProgressRef.current) return
    
    try {
      saveInProgressRef.current = true
      await saveCanvasState(projectId, nodes, edges, viewport)
      toast.success('Canvas saved')
    } catch (error) {
      console.error('Manual save failed:', error)
      toast.error('Failed to save canvas')
    } finally {
      saveInProgressRef.current = false
    }
  }, [projectId, nodes, edges, viewport])
  
  // Save on unmount
  useEffect(() => {
    return () => {
      if (projectId && enabled && !saveInProgressRef.current) {
        // Flush any pending saves
        debouncedSave.flush()
      }
    }
  }, [projectId, enabled, debouncedSave])
  
  return {
    saveNow,
    isSaving: saveInProgressRef.current
  }
}
