import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const keyboardShortcutsDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.keyboardShortcuts,
  kind: 'blocking',
  getReturnFocusAccessPoint: () => 'top-header-keyboard-shortcuts',
}
