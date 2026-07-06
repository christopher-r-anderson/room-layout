import { msg } from '@lingui/core/macro'
import type { FurnitureItem } from '@/domain/furniture'
import { i18n } from '@/shared/i18n/i18n'
import { feedbackActions } from '@/core/stores/feedback-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  selectionFocusActions,
  useSelectionFocusStore,
} from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/core/scene-commands'
import { deleteSelection } from '@/core/operations/furniture-mutations'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { DELETE_DIALOG_ID } from './delete-dialog-definition'

export function confirmDeleteSelection(
  pendingDeleteFurniture: FurnitureItem | null,
) {
  const items = useSceneDocumentStore.getState().history.present
  const selectedSource = useSelectionFocusStore.getState().selectedSource

  const pendingId = pendingDeleteFurniture?.id ?? null
  const deletedIndex = pendingId
    ? items.findIndex((item) => item.id === pendingId)
    : -1
  const deletedName = pendingDeleteFurniture?.name ?? null

  dialogActions.closeActiveDialog()

  if (!sceneCommands.isSceneReady()) {
    feedbackActions.setStatusMessage(i18n._(DELETE_SELECTION_MISSING_MESSAGE))
    selectionEffects.notePendingSelection(null)
    return
  }

  const deleted = deleteSelection()

  if (!deleted) {
    feedbackActions.setStatusMessage(i18n._(DELETE_SELECTION_MISSING_MESSAGE))
    selectionEffects.notePendingSelection(null)
    return
  }

  feedbackActions.clearStatusMessage()
  selectionEffects.notePendingSelection({
    announceMode: 'suppress',
    requestOutlinerFocus: false,
  })

  const pendingFocusTarget = selectionEffects.consumePostDeleteFocusTarget()
  const isCanvasSource =
    selectedSource === 'canvas-keyboard' || selectedSource === 'canvas-pointer'
  const shouldFocusRoomView =
    pendingFocusTarget === 'room-view' ||
    (pendingFocusTarget === null && isCanvasSource)

  if (shouldFocusRoomView) {
    selectionEffects.notePostDeleteOutlinerFocusIndex(null)
    selectionFocusActions.requestRoomViewFocus()
  } else {
    selectionEffects.notePostDeleteOutlinerFocusIndex(
      deletedIndex >= 0 ? deletedIndex : 0,
    )
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
    selectionEffects.notePostDeleteFocusTarget(returnFocusTo)
    feedbackActions.clearStatusMessage()
  } else {
    selectionEffects.notePostDeleteFocusTarget(null)
  }
}
