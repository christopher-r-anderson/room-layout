import type { DialogDefinition } from '@/core/dialog-contract'

const headerMoreActionsDialogId = 'header-more-actions' as const

export const headerMoreActionsDialogDefinition = {
  id: headerMoreActionsDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
