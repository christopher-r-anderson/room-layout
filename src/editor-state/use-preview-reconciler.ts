import { useEffect } from 'react'
import { useIsBlockingOverlayOpen } from '@/editor-state/dialog-store'
import { useEditorInteractionsEnabled } from '@/editor-state/editor-runtime-store'
import { useIsDragging } from '@/editor-state/scene-state-store'
import {
  cancelScenePreviewClear,
  forceClearPreview,
} from '@/editor-state/preview-actions'

/**
 * Resets preview state hygiene when preview must not persist — dragging, a
 * blocking overlay open, or interactions disabled. The visible preview is
 * already suppressed by `usePreviewedId`'s read gating; this clears the raw id
 * and active source so nothing stale flashes back when the gate lifts.
 */
export function usePreviewReconciler(): void {
  const isDragging = useIsDragging()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()

  useEffect(() => {
    if (!isDragging && !isBlockingOverlayOpen && editorInteractionsEnabled) {
      return
    }

    forceClearPreview()
  }, [editorInteractionsEnabled, isDragging, isBlockingOverlayOpen])

  useEffect(() => {
    return () => {
      cancelScenePreviewClear()
    }
  }, [])
}
