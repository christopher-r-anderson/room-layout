import type { DialogDefinition } from '@/editor-state/dialog-contract'

export const projectInfoDialogId = 'project-info' as const

export const projectInfoDialogDefinition = {
  id: projectInfoDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
