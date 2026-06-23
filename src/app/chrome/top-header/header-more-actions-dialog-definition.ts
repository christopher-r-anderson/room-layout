import type { DialogDefinition } from '@/core/dialog-contract'

export const headerMoreActionsDialogId = 'header-more-actions' as const

export const headerMoreActionsDialogDefinition = {
  id: headerMoreActionsDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
