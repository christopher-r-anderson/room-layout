import type { DialogDefinition } from '@/editor-state/dialog-contract'

export const keyboardShortcutsDialogId = 'keyboard-shortcuts' as const

export const keyboardShortcutsDialogDefinition = {
  id: keyboardShortcutsDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
