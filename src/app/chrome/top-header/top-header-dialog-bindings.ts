import type { AppDialogOpenChange } from '@/app/dialogs/dialog-requests'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { dialogActions } from '@/editor-state/dialog-store'

/**
 * Stable DOM id for the mobile "More actions" drawer content. It is referenced
 * by the trigger's `aria-controls`, so it must stay a fixed string.
 */
export const HEADER_MORE_ACTIONS_CONTENT_ID = 'header-more-actions-content'

function makeOpenChange(id: string): AppDialogOpenChange {
  return (open, request) => dialogActions.setDialogOpen(id, open, request)
}

/**
 * Module-level open-change callbacks bound to each header dialog id. They are
 * stable references (no component state) so they can be used directly at any
 * call site without memoization.
 */
export const topHeaderDialogOpenChange = {
  roomSurface: makeOpenChange(DIALOG_IDS.roomSurface),
  projectInfo: makeOpenChange(DIALOG_IDS.projectInfo),
  keyboardShortcuts: makeOpenChange(DIALOG_IDS.keyboardShortcuts),
  headerMoreActions: makeOpenChange(DIALOG_IDS.headerMoreActions),
} as const
