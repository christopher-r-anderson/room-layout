import type { DialogDefinition } from '@/editor-state/dialog-contract'
import { headerMoreActionsDialogDefinition } from '@/app/chrome/top-header/header-more-actions-dialog-definition'
import { catalogDialogDefinition } from '@/features/catalog/catalog-dialog-definition'
import { keyboardShortcutsDialogDefinition } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { projectInfoDialogDefinition } from '@/features/project-info/project-info-dialog-definition'
import { roomSurfaceDialogDefinition } from '@/features/room-surface/room-surface-dialog-definition'
import { deleteDialogDefinition } from '@/features/selection/delete-dialog-definition'
import { startOverDialogDefinition } from '@/features/startup/start-over-dialog-definition'

const dialogDefinitions = {
  catalog: catalogDialogDefinition,
  delete: deleteDialogDefinition,
  roomSurface: roomSurfaceDialogDefinition,
  keyboardShortcuts: keyboardShortcutsDialogDefinition,
  projectInfo: projectInfoDialogDefinition,
  headerMoreActions: headerMoreActionsDialogDefinition,
  startOver: startOverDialogDefinition,
} as const satisfies Record<string, DialogDefinition>

type AppDialogDefinition =
  (typeof dialogDefinitions)[keyof typeof dialogDefinitions]

export const DIALOG_DEFINITIONS = Object.values(
  dialogDefinitions,
) as AppDialogDefinition[]

function deriveDialogIds<TDefinitions extends Record<string, { id: string }>>(
  definitions: TDefinitions,
): {
  [K in keyof TDefinitions]: TDefinitions[K]['id']
} {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, definition]) => [
      key,
      definition.id,
    ]),
  ) as {
    [K in keyof TDefinitions]: TDefinitions[K]['id']
  }
}

export const DIALOG_IDS = deriveDialogIds(dialogDefinitions)
