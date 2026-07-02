import type { DialogDefinition } from '@/core/dialog-contract'

export const CATALOG_DIALOG_ID = 'catalog' as const

export const catalogDialogDefinition = {
  id: CATALOG_DIALOG_ID,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled(),
} satisfies DialogDefinition
