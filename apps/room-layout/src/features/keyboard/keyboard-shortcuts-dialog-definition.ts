import type { DialogDefinition } from '@/core/dialog-contract'

export const KEYBOARD_SHORTCUTS_DIALOG_ID = 'keyboard-shortcuts' as const

export const keyboardShortcutsDialogDefinition = {
  id: KEYBOARD_SHORTCUTS_DIALOG_ID,
  kind: 'blocking',
} satisfies DialogDefinition
