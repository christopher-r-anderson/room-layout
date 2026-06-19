import { useCallback } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { sceneStateActions, useItems } from '@/editor-state/scene-state-store'
import { useSelectedSource } from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import { DELETE_SELECTION_MISSING_MESSAGE } from '@/shared/messages/command-messages'
import type { SelectionEffectsApi } from './use-selection-effects-controller'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
}

interface DeletionControllerOptions {
  announcements: AnnouncementsApi
  closeActiveDialog: () => void
  openDeleteDialog: () => boolean
  pendingDeleteFurniture: FurnitureItem | null
  editorInteractionsEnabled: boolean
  selectionEffects: SelectionEffectsApi
  focusRoomView: () => void
}

export function useDeletionController({
  announcements,
  closeActiveDialog,
  openDeleteDialog,
  pendingDeleteFurniture,
  editorInteractionsEnabled,
  selectionEffects,
  focusRoomView,
}: DeletionControllerOptions) {
  const items = useItems()
  const selectedSource = useSelectedSource()
  const { announcePolite } = announcements

  const handleConfirmDeleteSelection = useCallback(() => {
    const pendingId = pendingDeleteFurniture?.id ?? null
    const deletedIndex = pendingId
      ? items.findIndex((item) => item.id === pendingId)
      : -1
    const deletedName = pendingDeleteFurniture?.name ?? null

    closeActiveDialog()

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
      selectedSource === 'canvas-keyboard' ||
      selectedSource === 'canvas-pointer'
    const shouldFocusRoomView =
      pendingFocusTarget === 'room-view' ||
      (pendingFocusTarget === null && isCanvasSource)

    if (shouldFocusRoomView) {
      selectionEffects.notePostDeleteOutlinerFocusIndex(null)
      focusRoomView()
    } else {
      selectionEffects.notePostDeleteOutlinerFocusIndex(
        deletedIndex >= 0 ? deletedIndex : 0,
      )
    }

    if (deletedName) {
      announcePolite(`${deletedName} removed from room.`)
    }
  }, [
    announcePolite,
    closeActiveDialog,
    editorInteractionsEnabled,
    focusRoomView,
    items,
    pendingDeleteFurniture,
    selectedSource,
    selectionEffects,
  ])

  const handleOpenDeleteDialog = useCallback(() => {
    const opened = openDeleteDialog()

    if (opened) {
      selectionEffects.notePostDeleteFocusTarget('outliner')
      sceneStateActions.clearEditorMessage()
    } else {
      selectionEffects.notePostDeleteFocusTarget(null)
    }
  }, [openDeleteDialog, selectionEffects])

  const handleOpenDeleteDialogFromRoomView = useCallback(() => {
    const opened = openDeleteDialog()

    if (opened) {
      selectionEffects.notePostDeleteFocusTarget('room-view')
      sceneStateActions.clearEditorMessage()
    } else {
      selectionEffects.notePostDeleteFocusTarget(null)
    }
  }, [openDeleteDialog, selectionEffects])

  return {
    handleConfirmDeleteSelection,
    handleOpenDeleteDialog,
    handleOpenDeleteDialogFromRoomView,
  }
}
