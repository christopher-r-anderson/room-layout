import { useCallback, useEffect, useRef } from 'react'
import {
  sceneStateActions,
  useIsDragging,
  usePreviewedId,
} from '@/editor-state/scene-state-store'

const SCENE_PREVIEW_CLEAR_DELAY_MS = 50

type PreviewSource =
  | 'scene'
  | 'outliner-hover'
  | 'outliner-focus'
  | 'canvas-keyboard'
type OutlinerPreviewSource = 'outliner-hover' | 'outliner-focus'

interface UsePreviewControllerOptions {
  isBlockingOverlayOpen: boolean
  editorInteractionsEnabled: boolean
}

interface PreviewController {
  previewedId: string | null
  handleScenePreviewChange: (id: string | null) => void
  handleOutlinerPreviewChange: (
    id: string | null,
    source: OutlinerPreviewSource,
  ) => void
  handleCanvasKeyboardPreviewChange: (id: string | null) => void
  clearPreviewOnCanvasMiss: () => void
}

export function usePreviewController({
  isBlockingOverlayOpen,
  editorInteractionsEnabled,
}: UsePreviewControllerOptions): PreviewController {
  const scenePreviewClearTimeoutRef = useRef<number | null>(null)
  const previewSourceRef = useRef<PreviewSource | null>(null)
  const isDragging = useIsDragging()
  const previewedId = usePreviewedId({
    isBlockingOverlayOpen,
    editorInteractionsEnabled,
  })

  const setPreview = useCallback((id: string) => {
    sceneStateActions.setPreviewedId(id)
  }, [])

  const clearPreview = useCallback(() => {
    sceneStateActions.setPreviewedId(null)
  }, [])

  const cancelScenePreviewClear = useCallback(() => {
    if (scenePreviewClearTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(scenePreviewClearTimeoutRef.current)
    scenePreviewClearTimeoutRef.current = null
  }, [])

  const scheduleScenePreviewClear = useCallback(() => {
    cancelScenePreviewClear()

    scenePreviewClearTimeoutRef.current = window.setTimeout(() => {
      const isSceneSource = previewSourceRef.current === 'scene'
      scenePreviewClearTimeoutRef.current = null

      if (!isSceneSource) {
        return
      }

      previewSourceRef.current = null
      clearPreview()
    }, SCENE_PREVIEW_CLEAR_DELAY_MS)
  }, [cancelScenePreviewClear, clearPreview])

  const handleScenePreviewChange = useCallback(
    (id: string | null) => {
      if (id !== null) {
        cancelScenePreviewClear()
        previewSourceRef.current = 'scene'
        setPreview(id)
        return
      }

      scheduleScenePreviewClear()
    },
    [cancelScenePreviewClear, scheduleScenePreviewClear, setPreview],
  )

  const handleOutlinerPreviewChange = useCallback(
    (id: string | null, source: OutlinerPreviewSource) => {
      cancelScenePreviewClear()

      if (id !== null) {
        previewSourceRef.current = source
        setPreview(id)
        return
      }

      if (previewSourceRef.current !== source) {
        return
      }

      previewSourceRef.current = null
      clearPreview()
    },
    [cancelScenePreviewClear, clearPreview, setPreview],
  )

  const clearPreviewOnCanvasMiss = useCallback(() => {
    // Background clicks should clear preview immediately rather than waiting
    // for scene-leave hysteresis used to smooth pointer churn.
    cancelScenePreviewClear()
    previewSourceRef.current = null
    clearPreview()
  }, [cancelScenePreviewClear, clearPreview])

  const handleCanvasKeyboardPreviewChange = useCallback(
    (id: string | null) => {
      cancelScenePreviewClear()

      if (id !== null) {
        previewSourceRef.current = 'canvas-keyboard'
        setPreview(id)
        return
      }

      if (previewSourceRef.current !== 'canvas-keyboard') {
        return
      }

      previewSourceRef.current = null
      clearPreview()
    },
    [cancelScenePreviewClear, clearPreview, setPreview],
  )

  useEffect(() => {
    if (!isDragging && !isBlockingOverlayOpen && editorInteractionsEnabled) {
      return
    }

    cancelScenePreviewClear()
    previewSourceRef.current = null
    clearPreview()
  }, [
    cancelScenePreviewClear,
    clearPreview,
    editorInteractionsEnabled,
    isDragging,
    isBlockingOverlayOpen,
  ])

  useEffect(() => {
    return () => {
      cancelScenePreviewClear()
    }
  }, [cancelScenePreviewClear])

  return {
    previewedId,
    handleScenePreviewChange,
    handleOutlinerPreviewChange,
    handleCanvasKeyboardPreviewChange,
    clearPreviewOnCanvasMiss,
  }
}
