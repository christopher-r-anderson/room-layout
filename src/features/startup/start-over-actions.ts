import { msg } from '@lingui/core/macro'
import { dialogActions } from '@/core/stores/dialog-store'
import { feedback } from '@/core/stores/feedback-store'
import { resetSceneToDefaults } from '@/core/operations/scene-reset'
import { i18n } from '@/shared/i18n/i18n'
import { START_OVER_DIALOG_ID } from './start-over-dialog-definition'

/**
 * Opens the start-over confirmation dialog (the dialog store can refuse the
 * open while another blocking surface holds the editor).
 */
export function startOverIntent() {
  dialogActions.openDialog(START_OVER_DIALOG_ID)
}

/**
 * Confirms a start-over: closes the dialog, resets the scene to the loaded
 * environment's defaults, and surfaces the outcome. Focus return is owned by
 * the caller, since where focus lands depends on the trigger.
 */
export function confirmStartOver() {
  dialogActions.closeActiveDialog()
  resetSceneToDefaults()
  feedback.actionSuccess({
    title: i18n._(msg`Started over. Your changes were cleared.`),
  })
}
