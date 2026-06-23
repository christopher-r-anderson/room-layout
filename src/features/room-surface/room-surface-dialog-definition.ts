import type { DialogDefinition } from '@/core/dialog-contract'

const roomSurfaceDialogId = 'room-surface' as const

export const roomSurfaceDialogDefinition = {
  id: roomSurfaceDialogId,
  kind: 'non-blocking',
  canOpen: (context) => context.isDialogsEnabled(),
  getPayload: (_context, request) => request?.payload ?? null,
} satisfies DialogDefinition
