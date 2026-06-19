import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const roomSurfaceDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.roomSurface,
  kind: 'non-blocking',
  canOpen: (context) => context.isDialogsEnabled(),
  getPayload: (_context, request) => request?.payload ?? null,
  getReturnFocusAccessPoint: () => 'top-header-room',
}
