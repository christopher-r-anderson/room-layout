import type { DialogDefinition } from '@/editor-state/dialog-contract'

export const startOverDialogId = 'start-over' as const

export const startOverDialogDefinition = {
  id: startOverDialogId,
  kind: 'blocking',
  canOpen: (context) => context.isDialogsEnabled() && context.canStartOver(),
} satisfies DialogDefinition
