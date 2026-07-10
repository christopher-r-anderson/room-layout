import { msg } from '@lingui/core/macro'
import type { FurnitureItem } from '@/domain/furniture'
import { i18n } from '@/shared/i18n/i18n'
import { feedback } from '@/core/stores/feedback-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { getItems } from '@/core/stores/scene-document-store'
import { sceneCommands } from '@/core/scene-commands'
import { deleteSelection } from '@/core/operations/furniture-mutations'
import { requestFocus } from '@/core/operations/focus-actions'
import type { DeleteOriginSurface } from '@/core/commands/editor-command'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { DELETE_DIALOG_ID } from './delete-dialog-definition'

// Focus handoff between opening the delete dialog and confirming it: the
// opener declares which surface the gesture came from, the confirm hands that
// origin to the focus resolver once the item is gone.
let pendingDeleteOrigin: DeleteOriginSurface | null = null

export function confirmDeleteSelection(
  pendingDeleteFurniture: FurnitureItem | null,
) {
  const items = getItems()

  const pendingId = pendingDeleteFurniture?.id ?? null
  const deletedIndex = pendingId
    ? items.findIndex((item) => item.id === pendingId)
    : -1
  const deletedName = pendingDeleteFurniture?.name ?? null

  dialogActions.closeActiveDialog()

  const origin = pendingDeleteOrigin
  pendingDeleteOrigin = null

  if (!sceneCommands.isSceneReady()) {
    feedback.actionError({ title: i18n._(DELETE_SELECTION_MISSING_MESSAGE) })
    return
  }

  const deleted = deleteSelection()

  if (!deleted) {
    feedback.actionError({ title: i18n._(DELETE_SELECTION_MISSING_MESSAGE) })
    return
  }

  requestFocus(
    {
      kind: 'selected-item',
      operation: 'delete',
      neighborIndex: deletedIndex >= 0 ? deletedIndex : 0,
    },
    { surface: origin ?? undefined },
  )

  if (deletedName) {
    feedback.interactionUpdate(i18n._(msg`${deletedName} removed from room.`))
  }
}

export function openDeleteDialog(originSurface: DeleteOriginSurface) {
  const opened = dialogActions.openDialog(DELETE_DIALOG_ID)

  pendingDeleteOrigin = opened ? originSurface : null
}
