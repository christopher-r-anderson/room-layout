import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { announcementActions } from '@/editor-state/announcement-store'
import { selectById } from '@/editor-state/selection-actions'
import { sceneCommands } from '@/scene/scene-commands'
import { sortSpatially } from '@/shared/lib/three/spatial-sort'

interface UseCanvasKeyboardControllerOptions {
  previewedId: string | null
  applyCanvasKeyboardPreviewChange: (id: string | null) => void
}

interface CanvasKeyboardController {
  previewedIdRef: RefObject<string | null>
  handleCanvasKeyboardPreviewChange: (id: string | null) => void
  handleCanvasBrowse: (direction: 'next' | 'prev' | 'first' | 'last') => void
  handleCanvasSelectPreviewed: () => void
}

export function useCanvasKeyboardController({
  previewedId,
  applyCanvasKeyboardPreviewChange,
}: UseCanvasKeyboardControllerOptions): CanvasKeyboardController {
  const previewedIdRef = useRef<string | null>(null)

  useEffect(() => {
    previewedIdRef.current = previewedId
  }, [previewedId])

  const handleCanvasKeyboardPreviewChange = useCallback(
    (id: string | null) => {
      // Keep keyboard preview reads synchronous so a quick browse+select
      // sequence cannot observe a stale ref before effects flush.
      previewedIdRef.current = id
      applyCanvasKeyboardPreviewChange(id)
    },
    [applyCanvasKeyboardPreviewChange],
  )

  const handleCanvasBrowse = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      const snapshot = sceneCommands.getSnapshot()
      if (!snapshot || snapshot.items.length === 0) {
        return
      }

      const orderedIds = sortSpatially(snapshot.items)
      if (orderedIds.length === 0) {
        return
      }

      const currentIndex = orderedIds.indexOf(previewedIdRef.current ?? '')
      let nextIndex: number

      if (direction === 'first') {
        nextIndex = 0
      } else if (direction === 'last') {
        nextIndex = orderedIds.length - 1
      } else if (direction === 'next') {
        nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % orderedIds.length
      } else {
        nextIndex =
          currentIndex === -1
            ? orderedIds.length - 1
            : (currentIndex - 1 + orderedIds.length) % orderedIds.length
      }

      const nextId = orderedIds[nextIndex]
      handleCanvasKeyboardPreviewChange(nextId)

      const item = snapshot.items.find((sceneItem) => sceneItem.id === nextId)
      if (item) {
        announcementActions.announcePolite(item.name)
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
