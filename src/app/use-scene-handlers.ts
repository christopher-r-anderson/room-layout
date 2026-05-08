import { useCallback, useRef, type RefObject } from 'react'
import type {
  MoveSelectionResult,
  MoveSource,
  SceneReadModel,
  SelectByIdResult,
} from '@/scene/scene.types'
import type {
  FurnitureInstance,
  FurnitureItem,
} from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type { HistoryAvailability } from './history/history.types'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './startup/startup-transitions'
import {
  parseSceneUrl,
  serializeSceneToUrl,
  validateCatalogReferences,
} from './url-scene/scene-url'

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
  redo: () => boolean
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  undo: () => boolean
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
  catalog: FurnitureCatalogEntry[]
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  resetEditorShellState: () => void
  restoreInitialLayout: (instances: FurnitureInstance[]) => void
}

interface OverlayState {
  clearEditorMessage: () => void
  setEditorMessage: (message: string | null) => void
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
  handleCopySceneUrl: () => Promise<void>
  restoreOutcomeRef: RefObject<RestoreOutcome | null>
  restoreAttemptCountRef: RefObject<number>
}

export type RestoreOutcome = 'restored' | 'invalid' | 'skipped'

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
    setEditorMessage,
    handleHistoryChange,
    selectedFurniture,
    sceneReadModel,
  } = overlayState
  const {
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    resetEditorShellState,
    restoreInitialLayout,
    catalog,
  } = startup

  // One-shot guard: URL restore is attempted at most once per page load.
  // This ref lives in App's render tree and survives scene remounts and retries.
  const restoreAttemptedRef = useRef(false)
  const restoreOutcomeRef = useRef<RestoreOutcome | null>(null)
  const restoreAttemptCountRef = useRef(0)

  const handleAddFurniture = useCallback(() => {
    clearEditorMessage()
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
  }, [addFurniture, clearEditorMessage, syncSceneReadModel, announcePolite])

  const handleSelectById = useCallback(
    (id: string | null): SelectByIdResult => {
      const result = selectById(id)
      clearEditorMessage()
      syncSceneReadModel({ requestOutlinerFocus: false })
      return result
    },
    [selectById, clearEditorMessage, syncSceneReadModel],
  )

  const handleMoveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      clearEditorMessage()
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
    [
      moveSelection,
      syncSceneReadModel,
      clearEditorMessage,
      queueMovementAnnouncement,
    ],
  )

  const handleRotateSelection = useCallback(
    (direction: -1 | 1) => {
      const rotatingName = selectedFurniture?.name ?? null

      clearEditorMessage()
      rotateSelection(direction)
      syncSceneReadModel()

      if (rotatingName) {
        announcePolite(`${rotatingName} rotated.`)
      }
    },
    [
      rotateSelection,
      clearEditorMessage,
      syncSceneReadModel,
      announcePolite,
      selectedFurniture,
    ],
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
    const undid = undo()
    syncSceneReadModel()
    clearEditorMessage()
    if (undid) {
      announcePolite('Undo complete.')
    }
  }, [undo, syncSceneReadModel, clearEditorMessage, announcePolite])

  const handleRedo = useCallback(() => {
    const redid = redo()
    syncSceneReadModel()
    clearEditorMessage()
    if (redid) {
      announcePolite('Redo complete.')
    }
  }, [redo, syncSceneReadModel, clearEditorMessage, announcePolite])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    clearEditorMessage()
    syncSceneReadModel({ requestOutlinerFocus: false })
  }, [clearSelection, clearEditorMessage, syncSceneReadModel])

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
    // Restore from URL on first asset-ready event only (one-shot guard).
    if (!restoreAttemptedRef.current) {
      restoreAttemptedRef.current = true
      restoreAttemptCountRef.current += 1

      const parseResult = parseSceneUrl(window.location.href)

      if (parseResult.ok) {
        if (validateCatalogReferences(parseResult.items, catalog)) {
          try {
            restoreInitialLayout(parseResult.items)
            restoreOutcomeRef.current = 'restored'
            announcePolite('Room layout restored from shared link.')
          } catch {
            // Restore threw (e.g. catalog/model node mismatch) — fail closed.
            setEditorMessage(
              'Shared link could not be restored. Starting with an empty room.',
            )
            restoreOutcomeRef.current = 'invalid'
            announceAssertive(
              'Shared link could not be restored. Starting with an empty room.',
            )
          }
        } else {
          // Unknown catalog IDs — reject and keep empty scene.
          setEditorMessage(
            'Shared link contained unrecognized furniture. Starting with an empty room.',
          )
          restoreOutcomeRef.current = 'invalid'
          announceAssertive(
            'Shared link could not be restored. Starting with an empty room.',
          )
        }
      } else if (parseResult.reason !== 'no-param') {
        // Malformed URL payload — reject and keep empty scene.
        setEditorMessage(
          'Shared link could not be restored. Starting with an empty room.',
        )
        restoreOutcomeRef.current = 'invalid'
        announceAssertive(
          'Shared link could not be restored. Starting with an empty room.',
        )
      } else {
        // No scene param — normal startup.
        restoreOutcomeRef.current = 'skipped'
      }
    }

    syncSceneReadModel()
    handleAssetsReady()
  }, [
    handleAssetsReady,
    syncSceneReadModel,
    catalog,
    restoreInitialLayout,
    announcePolite,
    announceAssertive,
    setEditorMessage,
  ])

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

  const handleCopySceneUrl = useCallback(async () => {
    const url = serializeSceneToUrl(sceneReadModel.items, window.location.href)

    if (!url) {
      setEditorMessage('Scene is too large to share as a URL.')
      announceAssertive('Scene is too large to share as a URL.')
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      announcePolite('Scene URL copied to clipboard.')
    } catch {
      setEditorMessage('Could not copy URL to clipboard.')
      announceAssertive('Could not copy URL to clipboard.')
    }
  }, [
    sceneReadModel.items,
    setEditorMessage,
    announcePolite,
    announceAssertive,
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
    handleCopySceneUrl,
    restoreOutcomeRef,
    restoreAttemptCountRef,
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
