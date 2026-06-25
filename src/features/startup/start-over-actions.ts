import { toast } from 'sonner'
import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { resetSceneToDefaults } from '@/core/persistence/scene-reset'
import { startOverDialogId } from './start-over-dialog-definition'

const STARTED_OVER_MESSAGE = 'Started over. Your changes were cleared.'

/**
 * Opens the start-over confirmation dialog and clears any stale status message
 * once it is actually open (the dialog store can refuse the open while another
 * blocking surface holds the editor).
 */
export function startOverIntent() {
  const opened = dialogActions.openDialog(startOverDialogId)

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
  feedbackActions.announcePolite(STARTED_OVER_MESSAGE)
  toast.success(STARTED_OVER_MESSAGE)
}
