import type { DialogDefinition } from '@/core/dialog-contract'

export const catalogDialogId = 'catalog' as const

export const catalogDialogDefinition = {
  id: catalogDialogId,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled(),
} satisfies DialogDefinition
