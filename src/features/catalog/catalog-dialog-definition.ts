import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const catalogDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.catalog,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled(),
  getReturnFocusAccessPoint: () => 'none',
}
