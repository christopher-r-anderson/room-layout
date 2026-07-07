import { msg } from '@lingui/core/macro'
import type { FurnitureItem } from '@/domain/furniture'
import { i18n } from '@/shared/i18n/i18n'
import { feedbackActions } from '@/core/stores/feedback-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { getItems } from '@/core/stores/scene-document-store'
import {
  getSelectedSource,
  selectionActions,
} from '@/core/stores/selection-store'
import { sceneCommands } from '@/core/scene-commands'
import { deleteSelection } from '@/core/operations/furniture-mutations'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { DELETE_DIALOG_ID } from './delete-dialog-definition'

// Focus handoff between opening the delete dialog and confirming it: the
// opener knows which surface the gesture came from, the confirm decides where
// focus lands after the item is gone.
let pendingDeleteFocusTarget: 'room-view' | 'outliner' | null = null

export function confirmDeleteSelection(
  pendingDeleteFurniture: FurnitureItem | null,
) {
  const items = getItems()
  const selectedSource = getSelectedSource()

  const pendingId = pendingDeleteFurniture?.id ?? null
  const deletedIndex = pendingId
    ? items.findIndex((item) => item.id === pendingId)
    : -1
  const deletedName = pendingDeleteFurniture?.name ?? null

  dialogActions.closeActiveDialog()

  if (!sceneCommands.isSceneReady()) {
    feedbackActions.setStatusMessage(i18n._(DELETE_SELECTION_MISSING_MESSAGE))
    pendingDeleteFocusTarget = null
    return
  }

  const deleted = deleteSelection()

  if (!deleted) {
    feedbackActions.setStatusMessage(i18n._(DELETE_SELECTION_MISSING_MESSAGE))
    pendingDeleteFocusTarget = null
    return
  }

  feedbackActions.clearStatusMessage()

  const pendingFocusTarget = pendingDeleteFocusTarget
  pendingDeleteFocusTarget = null
  const isCanvasSource =
    selectedSource === 'canvas-keyboard' || selectedSource === 'canvas-pointer'
  const shouldFocusRoomView =
    pendingFocusTarget === 'room-view' ||
    (pendingFocusTarget === null && isCanvasSource)

  if (shouldFocusRoomView) {
    selectionActions.requestRoomViewFocus()
  } else {
    selectionActions.requestOutlinerFocus({
      token: Date.now(),
      preferredIndex: deletedIndex >= 0 ? deletedIndex : 0,
    })
  }

  if (deletedName) {
    feedbackActions.announcePolite(
      i18n._(msg`${deletedName} removed from room.`),
    )
  }
}

export function openDeleteDialog(returnFocusTo: 'room-view' | 'outliner') {
  const opened = dialogActions.openDialog(DELETE_DIALOG_ID)

  if (opened) {
    pendingDeleteFocusTarget = returnFocusTo
    feedbackActions.clearStatusMessage()
  } else {
    pendingDeleteFocusTarget = null
  }
}
