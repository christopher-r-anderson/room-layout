import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const deleteDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.delete,
  kind: 'blocking',
  canOpen: (context) => {
    return context.isDialogsEnabled() && context.getSelectedFurniture() !== null
  },
  getPayload: (context) => context.getSelectedFurniture(),
  getReturnFocusAccessPoint: () => 'none',
}
