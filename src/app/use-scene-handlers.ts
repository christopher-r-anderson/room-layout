import { useCallback } from 'react'
import type {
  MoveSelectionResult,
  MoveSource,
  SceneReadModel,
  SelectByIdResult,
} from '@/scene/scene.types'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { HistoryAvailability } from './history/history.types'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './startup/startup-transitions'

// ---------------------------------------------------------------------------
// Dependency slices accepted from outer hooks
// ---------------------------------------------------------------------------

interface Commands {
  addFurniture: () => boolean
  clearSelection: () => void
  confirmDeleteSelection: () => boolean
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  redo: () => void
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  undo: () => void
}

interface Sync {
  syncSceneReadModel: (options?: {
    announceSelectionChange?: boolean
    requestOutlinerFocus?: boolean
  }) => SceneReadModel | null
  requestOutlinerFocusByIndex: (preferredIndex: number) => void
}

interface Announcements {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAssertiveAnnouncement: () => void
  queueMovementAnnouncement: (message: string) => void
}

interface DialogState {
  closeDialog: () => void
  closeAllDialogs: () => void
  openDelete: () => boolean
  setCatalogOpen: (open: boolean) => boolean
  pendingDeleteFurniture: FurnitureItem | null
}

interface StartupSlice {
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  resetEditorShellState: () => void
}

interface OverlayState {
  clearEditorMessage: () => void
  sceneReadModel: SceneReadModel
  selectedFurniture: FurnitureItem | null
  handleHistoryChange: (availability: HistoryAvailability) => void
}

interface UseSceneHandlersOptions {
  commands: Commands
  sync: Sync
  announcements: Announcements
  dialogState: DialogState
  overlayState: OverlayState
  startup: StartupSlice
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface SceneHandlers {
  handleAddFurniture: () => boolean
  handleSelectById: (id: string | null) => SelectByIdResult
  handleMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  handleRotateSelection: (direction: -1 | 1) => void
  handleConfirmDeleteSelection: () => SceneReadModel | null
  handleUndo: () => void
  handleRedo: () => void
  handleClearSelection: () => void
  handleCatalogDrawerOpenChange: (open: boolean) => void
  handleOpenDeleteDialog: () => void
  handleSceneHistoryChange: (availability: HistoryAvailability) => void
  handleSceneSelectionChange: () => void
  handleSceneAssetError: (error: Error) => void
  handleSceneAssetsReady: () => void
  handleRetryAssetLoading: () => void
}

/**
 * Coordinator hook for scene mutation handlers. Co-locates all event handlers
 * that compose commands, sync, announcements, dialog, and overlay concerns.
 * Consumed only by App.tsx.
 */
export function useSceneHandlers({
  commands,
  sync,
  announcements,
  dialogState,
  overlayState,
  startup,
}: UseSceneHandlersOptions): SceneHandlers {
  // Destructure to stable function references so useCallback deps are stable.
  const {
    addFurniture,
    clearSelection,
    confirmDeleteSelection,
    moveSelection,
    redo,
    rotateSelection,
    selectById,
    undo,
  } = commands
  const { syncSceneReadModel, requestOutlinerFocusByIndex } = sync
  const {
    announcePolite,
    announceAssertive,
    clearAssertiveAnnouncement,
    queueMovementAnnouncement,
  } = announcements
  const {
    closeDialog,
    closeAllDialogs,
    openDelete,
    setCatalogOpen,
    pendingDeleteFurniture,
  } = dialogState
  const {
    clearEditorMessage,
    handleHistoryChange,
    selectedFurniture,
    sceneReadModel,
  } = overlayState
  const {
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    resetEditorShellState,
  } = startup

  const handleAddFurniture = useCallback(() => {
    const added = addFurniture()
    const nextReadModel = syncSceneReadModel({
      announceSelectionChange: false,
      requestOutlinerFocus: false,
    })

    if (added) {
      const addedItem = nextReadModel?.items.find(
        (item) => item.id === nextReadModel.selectedId,
      )

      if (addedItem) {
        announcePolite(`${addedItem.name} added to room.`)
      }
    }

    return added
  }, [addFurniture, syncSceneReadModel, announcePolite])

  const handleSelectById = useCallback(
    (id: string | null): SelectByIdResult => {
      const result = selectById(id)
      syncSceneReadModel({ requestOutlinerFocus: false })
      return result
    },
    [selectById, syncSceneReadModel],
  )

  const handleMoveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      const result = moveSelection(delta, options)

      if (result.ok) {
        const nextReadModel = syncSceneReadModel()
        const movedItem = nextReadModel?.items.find(
          (item) => item.id === nextReadModel.selectedId,
        )

        if (movedItem) {
          queueMovementAnnouncement(
            `${movedItem.name} moved to X ${formatCoordinate(movedItem.position[0])} and Z ${formatCoordinate(movedItem.position[2])}.`,
          )
        }

        return result
      }

      const blockedMessage = formatMoveBlockedMessage(result.reason)

      if (blockedMessage) {
        queueMovementAnnouncement(blockedMessage)
      }

      return result
    },
    [moveSelection, syncSceneReadModel, queueMovementAnnouncement],
  )

  const handleRotateSelection = useCallback(
    (direction: -1 | 1) => {
      const rotatingName = selectedFurniture?.name ?? null

      rotateSelection(direction)
      syncSceneReadModel()

      if (rotatingName) {
        announcePolite(`${rotatingName} rotated.`)
      }
    },
    [rotateSelection, syncSceneReadModel, announcePolite, selectedFurniture],
  )

  const handleConfirmDeleteSelection = useCallback(() => {
    const pendingId = pendingDeleteFurniture?.id ?? null
    const deletedIndex = pendingId
      ? sceneReadModel.items.findIndex((item) => item.id === pendingId)
      : -1
    const deletedName = pendingDeleteFurniture?.name ?? null

    closeDialog()

    const deleted = confirmDeleteSelection()
    const nextReadModel = syncSceneReadModel()

    if (deleted) {
      requestOutlinerFocusByIndex(deletedIndex >= 0 ? deletedIndex : 0)

      if (deletedName) {
        announcePolite(`${deletedName} removed from room.`)
      }
    }

    return nextReadModel
  }, [
    confirmDeleteSelection,
    syncSceneReadModel,
    announcePolite,
    requestOutlinerFocusByIndex,
    closeDialog,
    pendingDeleteFurniture,
    sceneReadModel.items,
  ])

  const handleUndo = useCallback(() => {
    undo()
    syncSceneReadModel()
    announcePolite('Undo complete.')
  }, [undo, syncSceneReadModel, announcePolite])

  const handleRedo = useCallback(() => {
    redo()
    syncSceneReadModel()
    announcePolite('Redo complete.')
  }, [redo, syncSceneReadModel, announcePolite])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    syncSceneReadModel({ requestOutlinerFocus: false })
  }, [clearSelection, syncSceneReadModel])

  const handleCatalogDrawerOpenChange = useCallback(
    (open: boolean) => {
      const changed = setCatalogOpen(open)

      if (open && changed) {
        clearEditorMessage()
      }
    },
    [setCatalogOpen, clearEditorMessage],
  )

  const handleOpenDeleteDialog = useCallback(() => {
    const opened = openDelete()

    if (opened) {
      clearEditorMessage()
    }
  }, [openDelete, clearEditorMessage])

  const handleSceneHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      handleHistoryChange(availability)
      syncSceneReadModel()
    },
    [handleHistoryChange, syncSceneReadModel],
  )

  const handleSceneSelectionChange = useCallback(() => {
    syncSceneReadModel({ requestOutlinerFocus: false })
  }, [syncSceneReadModel])

  const handleSceneAssetError = useCallback(
    (error: Error) => {
      runStartupAssetErrorTransition(error, {
        closeAllDialogs,
        recordAssetError: handleAssetError,
        resetEditorShellState,
      })
      announceAssertive('Unable to load room editor assets. Retry available.')
    },
    [
      closeAllDialogs,
      handleAssetError,
      resetEditorShellState,
      announceAssertive,
    ],
  )

  const handleSceneAssetsReady = useCallback(() => {
    handleAssetsReady()
    syncSceneReadModel()
  }, [handleAssetsReady, syncSceneReadModel])

  const handleRetryAssetLoading = useCallback(() => {
    runStartupRetryTransition({
      closeAllDialogs,
      resetEditorShellState,
      retryAssetLoading,
    })
    clearAssertiveAnnouncement()
  }, [
    closeAllDialogs,
    resetEditorShellState,
    retryAssetLoading,
    clearAssertiveAnnouncement,
  ])

  return {
    handleAddFurniture,
    handleSelectById,
    handleMoveSelection,
    handleRotateSelection,
    handleConfirmDeleteSelection,
    handleUndo,
    handleRedo,
    handleClearSelection,
    handleCatalogDrawerOpenChange,
    handleOpenDeleteDialog,
    handleSceneHistoryChange,
    handleSceneSelectionChange,
    handleSceneAssetError,
    handleSceneAssetsReady,
    handleRetryAssetLoading,
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} meters`
}

function formatMoveBlockedMessage(
  reason: Exclude<MoveSelectionResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return 'Movement blocked by room bounds.'
    case 'blocked-collision':
      return 'Movement blocked by another furniture item.'
    case 'dragging':
      return 'Finish dragging before using movement controls.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}
