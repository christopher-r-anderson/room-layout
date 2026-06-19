import type { DialogDefinition } from '@/editor-state/dialog-contract'

export const deleteDialogId = 'delete' as const

export const deleteDialogDefinition = {
  id: deleteDialogId,
  kind: 'blocking',
  canOpen: (context) => {
    return context.isDialogsEnabled() && context.getSelectedFurniture() !== null
  },
  getPayload: (context) => context.getSelectedFurniture(),
} satisfies DialogDefinition
