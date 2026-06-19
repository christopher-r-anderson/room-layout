import type { DialogDefinition } from '@/editor-state/dialog-contract'

export const roomSurfaceDialogId = 'room-surface' as const

export const roomSurfaceDialogDefinition = {
  id: roomSurfaceDialogId,
  kind: 'non-blocking',
  canOpen: (context) => context.isDialogsEnabled(),
  getPayload: (_context, request) => request?.payload ?? null,
} satisfies DialogDefinition
