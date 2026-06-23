import { announcementActions } from '@/core/stores/announcement-store'
import { editorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'

export function undo() {
  const editorInteractionsEnabled =
    editorLifecycleStore.getState().startupPhase === 'ready'
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
  sceneDocumentActions.clearEditorMessage()

  if (undid) {
    announcementActions.announcePolite('Undo complete.')
  }
}

export function redo() {
  const editorInteractionsEnabled =
    editorLifecycleStore.getState().startupPhase === 'ready'
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
  sceneDocumentActions.clearEditorMessage()

  if (redid) {
    announcementActions.announcePolite('Redo complete.')
  }
}
