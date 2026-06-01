import { useCallback } from 'react'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { SelectionEffectsApi } from './use-scene-selection-effects'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
}

interface HistoryControllerOptions {
  announcements: AnnouncementsApi
  editorInteractionsEnabled: boolean
  selectionEffects: SelectionEffectsApi
}

export function useHistoryController({
  announcements,
  editorInteractionsEnabled,
  selectionEffects,
}: HistoryControllerOptions) {
  const { announcePolite } = announcements

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
      announcePolite('Undo complete.')
    }
  }, [announcePolite, editorInteractionsEnabled, selectionEffects])

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
      announcePolite('Redo complete.')
    }
  }, [announcePolite, editorInteractionsEnabled, selectionEffects])

  return {
    handleUndo,
    handleRedo,
  }
}
