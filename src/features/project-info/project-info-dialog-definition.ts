import type { DialogDefinition } from '@/core/dialog-contract'

const projectInfoDialogId = 'project-info' as const

export const projectInfoDialogDefinition = {
  id: projectInfoDialogId,
  kind: 'blocking',
} satisfies DialogDefinition
