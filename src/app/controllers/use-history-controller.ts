import { useCallback } from 'react'
import { announcementActions } from '@/editor-state/announcement-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectionEffectsApi } from '@/editor-state/selection-effects'

interface HistoryControllerOptions {
  editorInteractionsEnabled: boolean
  selectionEffects: SelectionEffectsApi
}

export function useHistoryController({
  editorInteractionsEnabled,
  selectionEffects,
}: HistoryControllerOptions) {
  const handleUndo = useCallback(() => {
    const undid =
      editorInteractionsEnabled && sceneCommands.isSceneReady()
        ? sceneCommands.undo()
        : false
    selectionEffects.notePendingSelection(
      undid
        ? {
            announceMode: 'suppress',
            requestOutlinerFocus: true,
          }
        : null,
    )
    sceneStateActions.clearEditorMessage()
    if (undid) {
      announcementActions.announcePolite('Undo complete.')
    }
  }, [editorInteractionsEnabled, selectionEffects])

  const handleRedo = useCallback(() => {
    const redid =
      editorInteractionsEnabled && sceneCommands.isSceneReady()
        ? sceneCommands.redo()
        : false
    selectionEffects.notePendingSelection(
      redid
        ? {
            announceMode: 'suppress',
            requestOutlinerFocus: true,
          }
        : null,
    )
    sceneStateActions.clearEditorMessage()
    if (redid) {
      announcementActions.announcePolite('Redo complete.')
    }
  }, [editorInteractionsEnabled, selectionEffects])

  return {
    handleUndo,
    handleRedo,
  }
}
