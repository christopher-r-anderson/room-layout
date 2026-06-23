import { useEffect } from 'react'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useIsDragging } from '@/core/stores/scene-document-store'
import {
  cancelScenePreviewClear,
  forceClearPreview,
} from '@/core/operations/preview-actions'

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
