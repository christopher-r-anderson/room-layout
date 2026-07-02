import type { DialogDefinition } from '@/core/dialog-contract'

export const ROOM_SURFACE_DIALOG_ID = 'room-surface' as const

export const roomSurfaceDialogDefinition = {
  id: ROOM_SURFACE_DIALOG_ID,
  kind: 'non-blocking',
  canOpen: (context) => context.isDialogsEnabled(),
} satisfies DialogDefinition
