import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { startOverDialogId } from './start-over-dialog-definition'

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
