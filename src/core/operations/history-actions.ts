import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'

export function undo() {
  const undid = sceneCommands.isSceneReady() ? sceneCommands.undo() : false

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
  const redid = sceneCommands.isSceneReady() ? sceneCommands.redo() : false

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
