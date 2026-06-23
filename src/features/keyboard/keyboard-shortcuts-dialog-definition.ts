import type { DialogDefinition } from '@/core/dialog-contract'

const keyboardShortcutsDialogId = 'keyboard-shortcuts' as const

export const keyboardShortcutsDialogDefinition = {
  id: keyboardShortcutsDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
