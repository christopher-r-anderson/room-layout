import { feedbackActions } from '@/core/stores/feedback-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'

export function undo() {
  const editorInteractionsEnabled = isEditorInteractive()
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
  feedbackActions.clearStatusMessage()

  if (undid) {
    feedbackActions.announcePolite('Undo complete.')
  }
}

export function redo() {
  const editorInteractionsEnabled = isEditorInteractive()
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
  feedbackActions.clearStatusMessage()

  if (redid) {
    feedbackActions.announcePolite('Redo complete.')
  }
}
