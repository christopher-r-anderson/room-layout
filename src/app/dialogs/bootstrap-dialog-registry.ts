import type { DialogRuntimeContext } from '@/editor-state/dialog-contract'
import { dialogActions } from '@/editor-state/dialog-store'
import { catalogDialogDefinition } from '@/features/catalog/catalog-dialog-definition'
import { deleteDialogDefinition } from '@/features/selection/delete-dialog-definition'
import { keyboardShortcutsDialogDefinition } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { projectInfoDialogDefinition } from '@/features/project-info/project-info-dialog-definition'
import { startOverDialogDefinition } from '@/features/startup/start-over-dialog-definition'
import { roomSurfaceDialogDefinition } from '@/features/room-surface/room-surface-dialog-definition'
import { headerMoreActionsDialogDefinition } from '@/app/chrome/top-header/header-more-actions-dialog-definition'

let registryBootstrapped = false

const DIALOG_DEFINITIONS = [
  catalogDialogDefinition,
  deleteDialogDefinition,
  keyboardShortcutsDialogDefinition,
  projectInfoDialogDefinition,
  startOverDialogDefinition,
  roomSurfaceDialogDefinition,
  headerMoreActionsDialogDefinition,
]

export function bootstrapDialogRegistry(context: DialogRuntimeContext) {
  dialogActions.configureRuntimeContext(context)

  if (registryBootstrapped) {
    return
  }

  dialogActions.registerDialogDefinitions(DIALOG_DEFINITIONS)
  registryBootstrapped = true
}

export function resetDialogRegistryForTests() {
  registryBootstrapped = false
}
