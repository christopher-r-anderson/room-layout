import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectById } from '@/core/operations/selection-actions'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { sceneCommands } from '@/scene/scene-commands'
import {
  resolveBrowseTarget,
  sortSpatially,
  type BrowseDirection,
} from './canvas-keyboard-navigation'

interface UseCanvasKeyboardControllerOptions {
  previewedId: string | null
}

interface CanvasKeyboardController {
  previewedIdRef: RefObject<string | null>
  handleCanvasKeyboardPreviewChange: (id: string | null) => void
  handleCanvasBrowse: (direction: 'next' | 'prev' | 'first' | 'last') => void
  handleCanvasSelectPreviewed: () => void
}

export function useCanvasKeyboardController({
  previewedId,
}: UseCanvasKeyboardControllerOptions): CanvasKeyboardController {
  const previewedIdRef = useRef<string | null>(null)

  useEffect(() => {
    previewedIdRef.current = previewedId
  }, [previewedId])

  const handleCanvasKeyboardPreviewChange = useCallback((id: string | null) => {
    // Keep keyboard preview reads synchronous so a quick browse+select
    // sequence cannot observe a stale ref before effects flush.
    previewedIdRef.current = id
    previewFromCanvasKeyboard(id)
  }, [])

  const handleCanvasBrowse = useCallback(
    (direction: BrowseDirection) => {
      const snapshot = sceneCommands.getSnapshot()
      if (!snapshot || snapshot.items.length === 0) {
        return
      }

      const orderedIds = sortSpatially(snapshot.items)
      const nextId = resolveBrowseTarget(
        orderedIds,
        previewedIdRef.current,
        direction,
      )
      if (!nextId) {
        return
      }

      handleCanvasKeyboardPreviewChange(nextId)

      const item = snapshot.items.find((sceneItem) => sceneItem.id === nextId)
      if (item) {
        feedbackActions.announcePolite(item.name)
      }
    },
    [handleCanvasKeyboardPreviewChange],
  )

  const handleCanvasSelectPreviewed = useCallback(() => {
    const id = previewedIdRef.current
    if (!id) {
      return
    }

    selectById(id, 'canvas-keyboard')
    handleCanvasKeyboardPreviewChange(null)
  }, [handleCanvasKeyboardPreviewChange])

  return {
    previewedIdRef,
    handleCanvasKeyboardPreviewChange,
    handleCanvasBrowse,
    handleCanvasSelectPreviewed,
  }
}
