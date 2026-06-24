import { useCallback } from 'react'
import { sceneDocumentStore } from '@/core/scene-contracts'

interface UseSelectionOperationsOptions {
  isDragging: boolean
  onCanvasPointerSelection?: (id: string) => void
  selectFurniture: (id: string | null) => void
  setSelectedIdAndResolveObject: (id: string | null) => void
}

// Selection service handlers. `select` is the canvas-pointer path (notifies the
// app, then commits); `selectById`/`clearSelection` are the programmatic paths,
// both blocked mid-drag. Selection identity is owned by use-scene-selection;
// these wrap it with the drag guard and the pointer notification.
export function useSelectionOperations({
  isDragging,
  onCanvasPointerSelection,
  selectFurniture,
  setSelectedIdAndResolveObject,
}: UseSelectionOperationsOptions) {
  const select = useCallback(
    (id: string) => {
      onCanvasPointerSelection?.(id)
      selectFurniture(id)
    },
    [onCanvasPointerSelection, selectFurniture],
  )

  const clearSelection = useCallback(() => {
    if (isDragging) {
      return
    }

    selectFurniture(null)
  }, [isDragging, selectFurniture])

  const selectById = useCallback(
    (id: string | null) => {
      const furnitureItems = sceneDocumentStore.getState().history.present

      if (isDragging) {
        return {
          ok: false as const,
          status: 'blocked-dragging' as const,
        }
      }

      if (id === null) {
        setSelectedIdAndResolveObject(null)
        return {
          ok: true as const,
          status: 'cleared' as const,
        }
      }

      const itemExists = furnitureItems.some((item) => item.id === id)

      if (!itemExists) {
        return {
          ok: false as const,
          status: 'not-found' as const,
        }
      }

      setSelectedIdAndResolveObject(id)

      return {
        ok: true as const,
        status: 'selected' as const,
      }
    },
    [isDragging, setSelectedIdAndResolveObject],
  )

  return { select, clearSelection, selectById }
}
