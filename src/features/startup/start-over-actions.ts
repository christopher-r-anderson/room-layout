import { msg } from '@lingui/core/macro'
import { dialogActions } from '@/core/stores/dialog-store'
import { feedback } from '@/core/feedback/feedback'
import { feedbackActions } from '@/core/stores/feedback-store'
import { resetSceneToDefaults } from '@/core/operations/scene-reset'
import { i18n } from '@/shared/i18n/i18n'
import { START_OVER_DIALOG_ID } from './start-over-dialog-definition'

/**
 * Opens the start-over confirmation dialog and clears any stale status message
 * once it is actually open (the dialog store can refuse the open while another
 * blocking surface holds the editor).
 */
export function startOverIntent() {
  const opened = dialogActions.openDialog(START_OVER_DIALOG_ID)

  if (opened) {
    feedbackActions.clearStatusMessage()
  }
}

/**
 * Confirms a start-over: closes the dialog, resets the scene to the loaded
 * environment's defaults, and surfaces the outcome. Focus return is owned by
 * the caller, since where focus lands depends on the trigger.
 */
export function confirmStartOver() {
  dialogActions.closeActiveDialog()
  resetSceneToDefaults()
  const startedOver = i18n._(msg`Started over. Your changes were cleared.`)
  feedbackActions.announcePolite(startedOver)
  feedback.actionSuccess({ title: startedOver })
}
