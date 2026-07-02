import type { DialogDefinition } from '@/core/dialog-contract'

export const roomSurfaceDialogId = 'room-surface' as const

export const roomSurfaceDialogDefinition = {
  id: roomSurfaceDialogId,
  kind: 'non-blocking',
  canOpen: (context) => context.isDialogsEnabled(),
} satisfies DialogDefinition
