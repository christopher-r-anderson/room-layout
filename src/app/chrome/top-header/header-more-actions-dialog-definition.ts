import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const headerMoreActionsDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.headerMoreActions,
  kind: 'blocking',
  getReturnFocusAccessPoint: () => 'top-header-more-actions',
}
