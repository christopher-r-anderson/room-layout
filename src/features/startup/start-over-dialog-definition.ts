import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const startOverDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.startOver,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled(),
  getReturnFocusAccessPoint: () => 'top-header-start-over',
}
