import { canRedoHistory, canUndoHistory } from '@/shared/lib/ui/editor-history'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { useIsDragging } from '@/core/stores/scene-session-store'
import type { HistoryAvailability } from '@/core/types/history.types'

/**
 * Undo/redo availability for the header controls. Cross-store derived state:
 * the document history says what is undoable; an active drag dampens both,
 * mirroring the mid-drag guard in the undo/redo mutations.
 */
export function useHistoryAvailability(): HistoryAvailability {
  const isDragging = useIsDragging()
  const canUndo = useSceneDocumentStore((state) =>
    canUndoHistory(state.history),
  )
  const canRedo = useSceneDocumentStore((state) =>
    canRedoHistory(state.history),
  )

  return {
    canUndo: canUndo && !isDragging,
    canRedo: canRedo && !isDragging,
  }
}
