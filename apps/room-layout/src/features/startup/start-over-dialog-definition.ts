import type { DialogDefinition } from '@/core/dialog-contract'

export const START_OVER_DIALOG_ID = 'start-over' as const

export const startOverDialogDefinition = {
  id: START_OVER_DIALOG_ID,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled() && context.canStartOver(),
} satisfies DialogDefinition
