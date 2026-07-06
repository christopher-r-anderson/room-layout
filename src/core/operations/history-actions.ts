import { msg } from '@lingui/core/macro'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/core/scene-commands'
import { i18n } from '@/shared/i18n/i18n'

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
    feedbackActions.announcePolite(i18n._(msg`Undo complete.`))
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
    feedbackActions.announcePolite(i18n._(msg`Redo complete.`))
  }
}
