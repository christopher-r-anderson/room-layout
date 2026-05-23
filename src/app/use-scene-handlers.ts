import { useCallback, useRef, type RefObject } from 'react'
import { isSceneStateAtDefaults } from '@/lib/three/scene-model'
import type {
  CameraPreset,
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
import type { InteractionSource } from './scene-interaction.types'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './startup/startup-transitions'
import {
  SCENE_URL_PARAM,
  type ParseSceneUrlResult,
  parseSceneUrl,
  serializeSceneToUrl,
  validateCatalogReferences,
} from './url-scene/scene-url'
import { createDefaultSceneState } from './startup/scene-defaults'
import {
  clearSceneDraft,
  loadSceneDraft,
  saveSceneDraft,
  type SceneDraftState,
} from './url-scene/scene-draft'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Dependency slices accepted from outer hooks
// ---------------------------------------------------------------------------

interface Commands {
  addFurniture: () => boolean
  clearSelection: () => void
  confirmDeleteSelection: () => boolean
  focusSelected: () => void
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  redo: () => boolean
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  setCameraPreset: (preset: CameraPreset) => void
  undo: () => boolean
}

interface Sync {
  syncSceneReadModel: (options?: {
    announceSelectionChange?: boolean
    requestOutlinerFocus?: boolean
  }) => SceneReadModel | null
  requestOutlinerFocusByIndex: (preferredIndex: number) => void
  focusRoomView: () => void
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
  openNewScene: () => boolean
  setCatalogOpen: (open: boolean) => boolean
  pendingDeleteFurniture: FurnitureItem | null
}

interface StartupSlice {
  activeFloorFinishId: string
  activeWallFinishId: string
  catalog: FurnitureCatalogEntry[]
  defaultFloorFinishId: string
  defaultWallFinishId: string
  editorInteractionsEnabled: boolean
  floorFinishIds: string[]
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  resetEditorShellState: () => void
  restoreInitialLayout: (instances: FurnitureInstance[]) => void
  setFloorFinishId: (id: string) => void
  setWallFinishId: (id: string) => void
  wallFinishIds: string[]
}

interface OverlayState {
  clearPreview: () => void
  clearEditorMessage: () => void
  setEditorMessage: (message: string | null) => void
  selectedSource: InteractionSource
  setSelectedSource: (source: InteractionSource) => void
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
  handleFocusSelected: () => void
  handleSelectById: (
    id: string | null,
    source?: InteractionSource,
  ) => SelectByIdResult
  handleMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  handleRotateSelection: (direction: -1 | 1) => void
  handleConfirmDeleteSelection: () => SceneReadModel | null
  handleUndo: () => void
  handleRedo: () => void
  handleClearSelection: () => void
  handleSetCameraPreset: (preset: CameraPreset) => void
  handleCatalogDrawerOpenChange: (open: boolean) => void
  handleOpenDeleteDialog: () => void
  handleOpenNewSceneDialog: () => void
  handleConfirmNewScene: () => void
  handleSceneHistoryChange: (availability: HistoryAvailability) => void
  handleSceneSelectionChange: (item: FurnitureItem | null) => void
  handleSceneAssetError: (error: Error) => void
  handleSceneAssetsReady: () => void
  handleRetryAssetLoading: () => void
  handleCopySceneUrl: () => Promise<boolean>
  restoreOutcomeRef: RefObject<RestoreOutcome | null>
  restoreAttemptCountRef: RefObject<number>
}

export type RestoreOutcome = 'restored' | 'invalid' | 'skipped'

interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
}

type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

interface RestoreFlowNotifications {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  setEditorMessage: (message: string) => void
  setRestoreOutcome: (outcome: RestoreOutcome) => void
  toastSuccess: (message: string) => void
  toastWarning: (message: string) => void
  toastError: (message: string) => void
}

interface InvalidRestoreCase {
  editorMessage: string
  assertiveMessage: string
  toastMessage: string
}

function tryRestoreDraft(
  draftState: RestorableState | null,
  applyState: (state: RestorableState) => void,
): DraftRestoreAttempt {
  if (!draftState) {
    return 'missing'
  }

  try {
    applyState(draftState)
    return 'restored'
  } catch {
    return 'failed'
  }
}

function reportInvalidRestore(
  notifications: RestoreFlowNotifications,
  invalidCase: InvalidRestoreCase,
) {
  notifications.setRestoreOutcome('invalid')
  notifications.setEditorMessage(invalidCase.editorMessage)
  notifications.announceAssertive(invalidCase.assertiveMessage)
  notifications.toastError(invalidCase.toastMessage)
}

function reportRecoveredDraftAfterInvalidLink(
  notifications: RestoreFlowNotifications,
  toastMessage: string,
) {
  const recoveredMessage =
    'Shared link could not be restored. Recovered your local draft.'
  notifications.setRestoreOutcome('invalid')
  notifications.setEditorMessage(recoveredMessage)
  notifications.announceAssertive(recoveredMessage)
  notifications.toastWarning(toastMessage)
}

function restoreFromInvalidLinkWithDraftFallback(
  notifications: RestoreFlowNotifications,
  applyState: (state: RestorableState) => void,
  draftState: RestorableState | null,
  options: {
    recoveredToastMessage: string
    whenDraftMissing: InvalidRestoreCase
    whenDraftFailed: InvalidRestoreCase
  },
) {
  const draftRestore = tryRestoreDraft(draftState, applyState)

  if (draftRestore === 'restored') {
    reportRecoveredDraftAfterInvalidLink(
      notifications,
      options.recoveredToastMessage,
    )
    return
  }

  reportInvalidRestore(
    notifications,
    draftRestore === 'failed'
      ? options.whenDraftFailed
      : options.whenDraftMissing,
  )
}

export function runStartupRestoreFlow(options: {
  parseResult: ParseSceneUrlResult
  catalog: FurnitureCatalogEntry[]
  validDraftState: SceneDraftState | null
  applyState: (state: RestorableState) => void
  isFreshState?: (state: RestorableState) => boolean
  notifications: RestoreFlowNotifications
}) {
  const {
    parseResult,
    catalog,
    validDraftState,
    applyState,
    isFreshState = () => false,
    notifications,
  } = options

  if (parseResult.ok) {
    if (validateCatalogReferences(parseResult.items, catalog)) {
      try {
        applyState(parseResult)
        notifications.setRestoreOutcome('restored')
        notifications.announcePolite('Room layout restored from shared link.')
        notifications.toastSuccess('Room layout restored from shared link.')
      } catch {
        restoreFromInvalidLinkWithDraftFallback(
          notifications,
          applyState,
          validDraftState,
          {
            recoveredToastMessage:
              'Shared link was invalid. Recovered your local draft.',
            whenDraftMissing: {
              editorMessage:
                'Shared link could not be restored. Starting with an empty room.',
              assertiveMessage:
                'Shared link could not be restored. Starting with an empty room.',
              toastMessage: 'Shared link could not be restored.',
            },
            whenDraftFailed: {
              editorMessage:
                'Shared link could not be restored. Draft also failed to restore. Starting with an empty room.',
              assertiveMessage:
                'Shared link and draft could not be restored. Starting with an empty room.',
              toastMessage: 'Shared link and draft could not be restored.',
            },
          },
        )
      }
      return
    }

    restoreFromInvalidLinkWithDraftFallback(
      notifications,
      applyState,
      validDraftState,
      {
        recoveredToastMessage:
          'Shared link contained unknown furniture. Draft restored.',
        whenDraftMissing: {
          editorMessage:
            'Shared link contained unrecognized furniture. Starting with an empty room.',
          assertiveMessage:
            'Shared link could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link contained unrecognized furniture.',
        },
        whenDraftFailed: {
          editorMessage:
            'Shared link had unknown furniture. Draft also failed to restore. Starting with an empty room.',
          assertiveMessage:
            'Shared link and draft could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link and draft could not be restored.',
        },
      },
    )
    return
  }

  if (parseResult.reason !== 'no-param') {
    restoreFromInvalidLinkWithDraftFallback(
      notifications,
      applyState,
      validDraftState,
      {
        recoveredToastMessage:
          'Shared link was invalid. Recovered your local draft.',
        whenDraftMissing: {
          editorMessage:
            'Shared link could not be restored. Starting with an empty room.',
          assertiveMessage:
            'Shared link could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link could not be restored.',
        },
        whenDraftFailed: {
          editorMessage:
            'Shared link was invalid. Draft also failed to restore. Starting with an empty room.',
          assertiveMessage:
            'Shared link and draft could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link and draft could not be restored.',
        },
      },
    )
    return
  }

  if (validDraftState) {
    try {
      applyState(validDraftState)
      if (!isFreshState(validDraftState)) {
        notifications.announcePolite('Restored your saved draft.')
        notifications.toastSuccess('Restored your saved draft.')
      }
    } catch {
      reportInvalidRestore(notifications, {
        editorMessage: 'Draft failed to restore. Starting with an empty room.',
        assertiveMessage:
          'Draft could not be restored. Starting with an empty room.',
        toastMessage: 'Draft could not be restored.',
      })
      return
    }
  }

  notifications.setRestoreOutcome('skipped')
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
    focusSelected,
    moveSelection,
    redo,
    rotateSelection,
    selectById,
    setCameraPreset,
    undo,
  } = commands
  const { syncSceneReadModel, requestOutlinerFocusByIndex, focusRoomView } =
    sync
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
    openNewScene,
    setCatalogOpen,
    pendingDeleteFurniture,
  } = dialogState
  const {
    clearPreview,
    clearEditorMessage,
    setEditorMessage,
    selectedSource,
    setSelectedSource,
    handleHistoryChange,
    selectedFurniture,
    sceneReadModel,
  } = overlayState
  const {
    activeFloorFinishId,
    activeWallFinishId,
    defaultFloorFinishId,
    defaultWallFinishId,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    resetEditorShellState,
    restoreInitialLayout,
    catalog,
    floorFinishIds,
    wallFinishIds,
    setFloorFinishId,
    setWallFinishId,
  } = startup

  // URL/draft restore runs only once per page load, even across scene remounts.
  const restoreAttemptedRef = useRef(false)
  const restoreOutcomeRef = useRef<RestoreOutcome | null>(null)
  const restoreAttemptCountRef = useRef(0)

  // When selection is triggered programmatically (e.g. handleSelectById), this
  // ref is set to the intended source BEFORE the scene mutation fires, so that
  // the resulting onSelectionChange callback can read the right source instead
  // of defaulting to 'canvas-pointer'.
  const pendingSelectionSourceRef = useRef<InteractionSource>(null)

  // Tracks the last selected ID seen by handleSceneSelectionChange so we can
  // distinguish a real selection-change event from a re-fire caused by a
  // reference change to the same selected item (e.g. position updates).
  const previousHandlerSelectedIdRef = useRef<string | null>(null)

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
    (id: string | null, source?: InteractionSource): SelectByIdResult => {
      if (source) {
        pendingSelectionSourceRef.current = source
        setSelectedSource(source)
      }
      const result = selectById(id)
      clearEditorMessage()
      if (source === 'canvas-keyboard') {
        const freshReadModel = syncSceneReadModel({
          requestOutlinerFocus: false,
          announceSelectionChange: false,
        })
        if (result.ok && result.status === 'selected' && id) {
          const item = freshReadModel?.items.find((i) => i.id === id)
          if (item) {
            announcePolite(
              `${item.name} selected. Press Tab to reach item controls in the Furniture List.`,
            )
          }
        } else if (result.ok && result.status === 'cleared') {
          announcePolite('Selection cleared.')
        }
      } else {
        syncSceneReadModel({ requestOutlinerFocus: false })
      }
      return result
    },
    [
      selectById,
      clearEditorMessage,
      setSelectedSource,
      syncSceneReadModel,
      announcePolite,
    ],
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
      const isCanvasSource =
        selectedSource === 'canvas-keyboard' ||
        selectedSource === 'canvas-pointer'

      if (isCanvasSource) {
        focusRoomView()
      } else {
        requestOutlinerFocusByIndex(deletedIndex >= 0 ? deletedIndex : 0)
      }

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
    focusRoomView,
    closeDialog,
    pendingDeleteFurniture,
    sceneReadModel.items,
    selectedSource,
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

  const handleOpenNewSceneDialog = useCallback(() => {
    const opened = openNewScene()

    if (opened) {
      clearEditorMessage()
    }
  }, [openNewScene, clearEditorMessage])

  const handleConfirmNewScene = useCallback(() => {
    closeDialog()
    clearPreview()
    clearEditorMessage()
    restoreInitialLayout([])
    setFloorFinishId(defaultFloorFinishId)
    setWallFinishId(defaultWallFinishId)
    setCameraPreset('corner')
    clearSceneDraft()
    syncSceneReadModel({
      announceSelectionChange: false,
      requestOutlinerFocus: false,
    })
    announcePolite('New scene started. Your changes were cleared.')
    toast.success('New scene started. Your changes were cleared.')
  }, [
    closeDialog,
    clearPreview,
    clearEditorMessage,
    restoreInitialLayout,
    setFloorFinishId,
    setWallFinishId,
    defaultFloorFinishId,
    defaultWallFinishId,
    setCameraPreset,
    syncSceneReadModel,
    announcePolite,
  ])

  const handleSceneHistoryChange = useCallback(
    (availability: HistoryAvailability) => {
      handleHistoryChange(availability)

      if (!editorInteractionsEnabled) {
        return
      }

      syncSceneReadModel()
    },
    [editorInteractionsEnabled, handleHistoryChange, syncSceneReadModel],
  )

  const handleSceneSelectionChange = useCallback(
    (item: FurnitureItem | null) => {
      if (!editorInteractionsEnabled) {
        return
      }

      const newId = item?.id ?? null

      // Only update selectedSource when the selection identity changes.
      // This guard is necessary because onSelectionChange also fires when the
      // selected item's properties change (e.g. after a move), and we must not
      // clobber the source that was set during the original selection event.
      if (newId !== previousHandlerSelectedIdRef.current) {
        previousHandlerSelectedIdRef.current = newId
        // If the selection was triggered programmatically (handleSelectById),
        // pendingSelectionSourceRef carries the intended source. Otherwise this
        // is a canvas-pointer selection (user clicked a mesh directly).
        const source = pendingSelectionSourceRef.current ?? 'canvas-pointer'
        pendingSelectionSourceRef.current = null
        setSelectedSource(source)
      }

      syncSceneReadModel({ requestOutlinerFocus: false })
    },
    [editorInteractionsEnabled, setSelectedSource, syncSceneReadModel],
  )

  const handleSceneAssetError = useCallback(
    (error: Error) => {
      runStartupAssetErrorTransition(error, {
        closeAllDialogs,
        recordAssetError: handleAssetError,
        resetEditorShellState,
      })
      toast.error('Unable to load room editor assets. Retry available.')
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
    // Notification channel policy for restore flows:
    // - setEditorMessage + announceAssertive: blocking/actionable restore failures.
    // - announcePolite (+ toast companion): successful/non-blocking restore info.
    // - toast is visual companion only, never the only notification channel.
    if (!restoreAttemptedRef.current) {
      restoreAttemptedRef.current = true
      restoreAttemptCountRef.current += 1

      const draftState = loadSceneDraft()
      const parseResult = parseSceneUrl(window.location.href)
      const shouldCleanupSceneParam = parseResult.ok
        ? true
        : parseResult.reason !== 'no-param'

      if (shouldCleanupSceneParam) {
        try {
          const url = new URL(window.location.href)

          while (url.searchParams.has(SCENE_URL_PARAM)) {
            url.searchParams.delete(SCENE_URL_PARAM)
          }

          window.history.replaceState(window.history.state, '', url.toString())
        } catch {
          // Ignore malformed URL/state failures and continue restore flow.
        }
      }

      const applyFinishIds = (
        floorFinishId: string | undefined,
        wallFinishId: string | undefined,
      ) => {
        if (floorFinishId && floorFinishIds.includes(floorFinishId)) {
          setFloorFinishId(floorFinishId)
        }

        if (wallFinishId && wallFinishIds.includes(wallFinishId)) {
          setWallFinishId(wallFinishId)
        }
      }

      const applyRestoredState = (state: RestorableState) => {
        restoreInitialLayout(state.items)
        applyFinishIds(state.floorFinishId, state.wallFinishId)
        saveSceneDraft(state.items, {
          floorFinishId: state.floorFinishId,
          wallFinishId: state.wallFinishId,
        })
      }

      const validDraftState =
        draftState && validateCatalogReferences(draftState.items, catalog)
          ? draftState
          : null

      const defaultSceneState = createDefaultSceneState({
        defaultFloorFinishId,
        defaultWallFinishId,
      })

      runStartupRestoreFlow({
        parseResult,
        catalog,
        validDraftState,
        applyState: applyRestoredState,
        isFreshState: (state) =>
          isSceneStateAtDefaults(
            {
              items: state.items,
              floorFinishId:
                state.floorFinishId ?? defaultSceneState.floorFinishId,
              wallFinishId:
                state.wallFinishId ?? defaultSceneState.wallFinishId,
            },
            defaultSceneState,
          ),
        notifications: {
          announcePolite,
          announceAssertive,
          setEditorMessage: (message) => {
            setEditorMessage(message)
          },
          setRestoreOutcome: (outcome) => {
            restoreOutcomeRef.current = outcome
          },
          toastSuccess: (message) => toast.success(message),
          toastWarning: (message) => toast.warning(message),
          toastError: (message) => toast.error(message),
        },
      })
    }

    syncSceneReadModel({
      announceSelectionChange: false,
      requestOutlinerFocus: false,
    })

    handleAssetsReady()
  }, [
    handleAssetsReady,
    syncSceneReadModel,
    catalog,
    defaultFloorFinishId,
    defaultWallFinishId,
    floorFinishIds,
    wallFinishIds,
    restoreInitialLayout,
    setFloorFinishId,
    setWallFinishId,
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
    const url = serializeSceneToUrl(
      sceneReadModel.items,
      window.location.href,
      {
        floorFinishId: floorFinishIds.includes(activeFloorFinishId)
          ? activeFloorFinishId
          : undefined,
        wallFinishId: wallFinishIds.includes(activeWallFinishId)
          ? activeWallFinishId
          : undefined,
      },
    )

    if (!url) {
      setEditorMessage('Scene is too large to share as a URL.')
      announceAssertive('Scene is too large to share as a URL.')
      return false
    }

    try {
      await navigator.clipboard.writeText(url)
      clearEditorMessage()
      announcePolite('Scene URL copied to clipboard.')
      return true
    } catch {
      setEditorMessage('Could not copy URL to clipboard.')
      announceAssertive('Could not copy URL to clipboard.')
      return false
    }
  }, [
    sceneReadModel.items,
    activeFloorFinishId,
    activeWallFinishId,
    floorFinishIds,
    wallFinishIds,
    clearEditorMessage,
    setEditorMessage,
    announcePolite,
    announceAssertive,
  ])

  const handleSetCameraPreset = useCallback(
    (preset: CameraPreset) => {
      setCameraPreset(preset)
    },
    [setCameraPreset],
  )

  const handleFocusSelected = useCallback(() => {
    focusSelected()
  }, [focusSelected])

  return {
    handleAddFurniture,
    handleFocusSelected,
    handleSelectById,
    handleMoveSelection,
    handleRotateSelection,
    handleConfirmDeleteSelection,
    handleUndo,
    handleRedo,
    handleClearSelection,
    handleSetCameraPreset,
    handleCatalogDrawerOpenChange,
    handleOpenDeleteDialog,
    handleOpenNewSceneDialog,
    handleConfirmNewScene,
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
