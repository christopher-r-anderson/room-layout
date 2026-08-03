import type {
  DialogDefinition,
  DialogRuntimeContext,
} from '@/core/dialog-contract'
import { dialogActions } from '@/core/stores/dialog-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { getSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { headerMoreActionsDialogDefinition } from '@/app/chrome/top-header/header-more-actions-dialog-definition'
import { catalogDialogDefinition } from '@/features/catalog/catalog-dialog-definition'
import { keyboardShortcutsDialogDefinition } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { projectInfoDialogDefinition } from '@/features/project-info/project-info-dialog-definition'
import { roomSurfaceDialogDefinition } from '@/features/room-surface/room-surface-dialog-definition'
import { deleteDialogDefinition } from '@/features/selection/delete-dialog-definition'
import { startOverDialogDefinition } from '@/features/startup/start-over-dialog-definition'

/**
 * The dialogs registered in the store at startup. Each dialog's id lives on its
 * own definition (and its exported id constant); this is only the membership
 * list, so consumers reference ids via those constants, not through here.
 */
export const DIALOG_DEFINITIONS: DialogDefinition[] = [
  catalogDialogDefinition,
  deleteDialogDefinition,
  roomSurfaceDialogDefinition,
  keyboardShortcutsDialogDefinition,
  projectInfoDialogDefinition,
  headerMoreActionsDialogDefinition,
  startOverDialogDefinition,
]

/**
 * The external state the dialog guards read. Every signal comes from a core
 * store or operation; app owns this wiring because it decides which signals
 * feed dialog readiness, while the store only declares the contract.
 */
export const dialogRuntimeContext: DialogRuntimeContext = {
  isDialogsEnabled: () => isEditorInteractive(),
  getSelectedFurniture: getSelectedFurniture,
  canStartOver: () => !getSceneIsAtDefaults(),
}

let registryBootstrapped = false

export function bootstrapDialogRegistry() {
  if (registryBootstrapped) {
    return
  }

  dialogActions.configureRuntimeContext(dialogRuntimeContext)
  dialogActions.registerDialogDefinitions(DIALOG_DEFINITIONS)
  registryBootstrapped = true
}

export function resetDialogRegistryForTests() {
  registryBootstrapped = false
}
