import type { DialogDefinition } from '@/core/dialog-contract'

export const PROJECT_INFO_DIALOG_ID = 'project-info' as const

export const projectInfoDialogDefinition = {
  id: PROJECT_INFO_DIALOG_ID,
  kind: 'blocking',
} satisfies DialogDefinition
