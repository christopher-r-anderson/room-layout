import type { DialogDefinition } from '@/editor-state/dialog-contract'
import {
  DIALOG_ACCESS_POINTS,
  type DialogAccessPoint,
} from '@/app/dialogs/dialog-focus'
import { headerMoreActionsDialogDefinition } from '@/app/chrome/top-header/header-more-actions-dialog-definition'
import { catalogDialogDefinition } from '@/features/catalog/catalog-dialog-definition'
import { keyboardShortcutsDialogDefinition } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { projectInfoDialogDefinition } from '@/features/project-info/project-info-dialog-definition'
import { roomSurfaceDialogDefinition } from '@/features/room-surface/room-surface-dialog-definition'
import { deleteDialogDefinition } from '@/features/selection/delete-dialog-definition'
import { startOverDialogDefinition } from '@/features/startup/start-over-dialog-definition'

function withDefaultReturnFocus<TDefinition extends DialogDefinition>(
  definition: TDefinition,
  defaultReturnFocus?: DialogAccessPoint,
): TDefinition {
  if (!defaultReturnFocus || definition.getReturnFocusAccessPoint) {
    return definition
  }

  return {
    ...definition,
    getReturnFocusAccessPoint: () => defaultReturnFocus,
  }
}

export const dialogDefinitions = {
  catalog: withDefaultReturnFocus(catalogDialogDefinition),
  delete: withDefaultReturnFocus(deleteDialogDefinition),
  roomSurface: withDefaultReturnFocus(
    roomSurfaceDialogDefinition,
    DIALOG_ACCESS_POINTS.topHeaderRoom,
  ),
  keyboardShortcuts: withDefaultReturnFocus(
    keyboardShortcutsDialogDefinition,
    DIALOG_ACCESS_POINTS.topHeaderKeyboardShortcuts,
  ),
  projectInfo: withDefaultReturnFocus(
    projectInfoDialogDefinition,
    DIALOG_ACCESS_POINTS.topHeaderProjectInfo,
  ),
  headerMoreActions: withDefaultReturnFocus(
    headerMoreActionsDialogDefinition,
    DIALOG_ACCESS_POINTS.topHeaderMoreActions,
  ),
  startOver: withDefaultReturnFocus(
    startOverDialogDefinition,
    DIALOG_ACCESS_POINTS.topHeaderStartOver,
  ),
} as const satisfies Record<string, DialogDefinition>

export type AppDialogDefinition =
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

export type AppDialogId = AppDialogDefinition['id']
