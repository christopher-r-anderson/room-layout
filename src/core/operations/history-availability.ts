import { useShallow } from 'zustand/react/shallow'
import { canRedoHistory, canUndoHistory } from '@/shared/lib/ui/editor-history'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { useIsDragging } from '@/core/stores/scene-session-store'

export interface HistoryAvailability {
  canUndo: boolean
  canRedo: boolean
}

/**
 * Undo/redo availability for the header controls. Cross-store derived state:
 * the document history says what is undoable; an active drag dampens both,
 * mirroring the mid-drag guard in the undo/redo mutations.
 */
export function useHistoryAvailability(): HistoryAvailability {
  const isDragging = useIsDragging()
  // The selector derives booleans (not the history reference) so the drag's
  // per-move history writes do not re-render the headers.
  const { canUndo, canRedo } = useSceneDocumentStore(
    useShallow((state) => ({
      canUndo: canUndoHistory(state.history),
      canRedo: canRedoHistory(state.history),
    })),
  )

  return {
    canUndo: canUndo && !isDragging,
    canRedo: canRedo && !isDragging,
  }
}
