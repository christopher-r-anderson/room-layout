import type { DialogDefinition } from '@/core/dialog-contract'

export const DELETE_DIALOG_ID = 'delete' as const

export const deleteDialogDefinition = {
  id: DELETE_DIALOG_ID,
  kind: 'blocking',
  canOpen: (context) => {
    return context.isDialogsEnabled() && context.getSelectedFurniture() !== null
  },
  getPayload: (context) => context.getSelectedFurniture(),
} satisfies DialogDefinition
