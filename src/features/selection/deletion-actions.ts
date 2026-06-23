import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { announcementActions } from '@/core/stores/announcement-store'
import { dialogActions } from '@/core/stores/dialog-store'
import { editorRuntimeStore } from '@/core/stores/editor-runtime-store'
import {
  sceneStateActions,
  sceneStateStore,
} from '@/core/stores/scene-state-store'
import {
  selectionMetaActions,
  selectionMetaStore,
} from '@/core/stores/selection-meta-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import { deleteDialogId } from './delete-dialog-definition'

export function confirmDeleteSelection(
  pendingDeleteFurniture: FurnitureItem | null,
) {
  const items = sceneStateStore.getState().history.present
  const selectedSource = selectionMetaStore.getState().selectedSource
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

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
    sceneStateActions.setEditorMessage(DELETE_SELECTION_MISSING_MESSAGE)
    selectionEffects.notePendingSelection(null)
    return
  }

  const deleted = sceneCommands.deleteSelection()

  if (!deleted) {
    sceneStateActions.setEditorMessage(DELETE_SELECTION_MISSING_MESSAGE)
    selectionEffects.notePendingSelection(null)
    return
  }

  sceneStateActions.clearEditorMessage()
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
    selectionMetaActions.requestRoomViewFocus()
  } else {
    selectionEffects.notePostDeleteOutlinerFocusIndex(
      deletedIndex >= 0 ? deletedIndex : 0,
    )
  }

  if (deletedName) {
    announcementActions.announcePolite(`${deletedName} removed from room.`)
  }
}

export function openDeleteDialog() {
  const opened = dialogActions.openDialog(deleteDialogId)

  if (opened) {
    selectionEffects.notePostDeleteFocusTarget('outliner')
    sceneStateActions.clearEditorMessage()
  } else {
    selectionEffects.notePostDeleteFocusTarget(null)
  }
}

export function openDeleteDialogFromRoomView() {
  const opened = dialogActions.openDialog(deleteDialogId)

  if (opened) {
    selectionEffects.notePostDeleteFocusTarget('room-view')
    sceneStateActions.clearEditorMessage()
  } else {
    selectionEffects.notePostDeleteFocusTarget(null)
  }
}
