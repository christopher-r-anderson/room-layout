import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { feedbackActions } from '@/core/stores/feedback-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  selectionFocusActions,
  selectionFocusStore,
} from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { deleteDialogId } from './delete-dialog-definition'

export function confirmDeleteSelection(
  pendingDeleteFurniture: FurnitureItem | null,
) {
  const items = sceneDocumentStore.getState().history.present
  const selectedSource = selectionFocusStore.getState().selectedSource
  const editorInteractionsEnabled = isEditorInteractive()

  const pendingId = pendingDeleteFurniture?.id ?? null
  const deletedIndex = pendingId
    ? items.findIndex((item) => item.id === pendingId)
    : -1
  const deletedName = pendingDeleteFurniture?.name ?? null

  dialogActions.closeActiveDialog()

  if (!editorInteractionsEnabled) {
    selectionEffects.notePendingSelection(null)
    return
  }

  if (!sceneCommands.isSceneReady()) {
    feedbackActions.setStatusMessage(DELETE_SELECTION_MISSING_MESSAGE)
    selectionEffects.notePendingSelection(null)
    return
  }

  const deleted = sceneCommands.deleteSelection()

  if (!deleted) {
    feedbackActions.setStatusMessage(DELETE_SELECTION_MISSING_MESSAGE)
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
    feedbackActions.announcePolite(`${deletedName} removed from room.`)
  }
}

export function openDeleteDialog() {
  const opened = dialogActions.openDialog(deleteDialogId)

  if (opened) {
    selectionEffects.notePostDeleteFocusTarget('outliner')
    feedbackActions.clearStatusMessage()
  } else {
    selectionEffects.notePostDeleteFocusTarget(null)
  }
}

export function openDeleteDialogFromRoomView() {
  const opened = dialogActions.openDialog(deleteDialogId)

  if (opened) {
    selectionEffects.notePostDeleteFocusTarget('room-view')
    feedbackActions.clearStatusMessage()
  } else {
    selectionEffects.notePostDeleteFocusTarget(null)
  }
}
