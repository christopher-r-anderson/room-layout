import type { DialogDefinition } from '@/core/dialog-contract'

export const HEADER_MORE_ACTIONS_DIALOG_ID = 'header-more-actions' as const

export const headerMoreActionsDialogDefinition = {
  id: HEADER_MORE_ACTIONS_DIALOG_ID,
  kind: 'blocking',
} satisfies DialogDefinition
