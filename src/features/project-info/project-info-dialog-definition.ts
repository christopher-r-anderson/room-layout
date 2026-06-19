import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { DIALOG_IDS } from '@/editor-state/dialog-contract'

export const projectInfoDialogDefinition: DialogDefinition = {
  id: DIALOG_IDS.projectInfo,
  kind: 'blocking',
  getReturnFocusAccessPoint: () => 'top-header-project-info',
}
