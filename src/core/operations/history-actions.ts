import { announcementActions } from '@/core/stores/announcement-store'
import { editorRuntimeStore } from '@/core/stores/editor-runtime-store'
import { sceneStateActions } from '@/core/stores/scene-state-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'

export function undo() {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'
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
}

export function redo() {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'
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
}
