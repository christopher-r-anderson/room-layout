import { useCallback, useEffect, useRef } from 'react'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from './selected-item-details.types'
import { isSceneStateAtDefaults } from '@/lib/three/scene-model'
import type {
  CameraPreset,
  MoveSelectionResult,
  MoveSource,
  SceneReadModel,
  SelectByIdResult,
  UpdateSelectionTransformResult,
} from '@/scene/scene.types'
import type {
  FurnitureInstance,
  FurnitureItem,
} from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type { DialogOpenOptions } from '@/editor-state/dialog-store'
import {
  editorRuntimeActions,
  type RestoreOutcome,
} from '@/editor-state/editor-runtime-store'
import {
  selectionMetaActions,
  useOutlinerFocusRequest,
} from '@/editor-state/selection-meta-store'
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
import { resolvePositionFromWallClearances } from '@/lib/three/wall-clearance'

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
  setSelectionTransform?: (input: {
    position?: [number, number, number]
    rotationY?: number
  }) => UpdateSelectionTransformResult
  redo: () => boolean
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  setCameraPreset: (preset: CameraPreset) => void
  undo: () => boolean
}

interface Sync {
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
  openStartOver: (options?: DialogOpenOptions) => boolean
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
  handleCanvasPointerSelection: (id: string) => void
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
  handleInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  handleUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
  handleConfirmDeleteSelection: () => SceneReadModel | null
  handleUndo: () => void
  handleRedo: () => void
  handleClearSelection: () => void
  handleSetCameraPreset: (preset: CameraPreset) => void
  handleCatalogDrawerOpenChange: (open: boolean) => void
  handleOpenDeleteDialog: () => void
  handleOpenDeleteDialogFromRoomView: () => void
  handleOpenStartOverDialog: (options?: DialogOpenOptions) => void
  handleConfirmStartOver: () => void
  handleSceneAssetError: (error: Error) => void
  handleSceneAssetsReady: () => void
  handleRetryAssetLoading: () => void
  handleShareSceneUrl: () => Promise<'shared' | 'copied' | null>
}

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

type SelectionAnnouncementMode =
  | 'default'
  | 'suppress'
  | 'added'
  | 'canvas-keyboard'
  | 'panel-keyboard'

interface PendingSelectionChangeBehavior {
  announceMode: SelectionAnnouncementMode
  requestOutlinerFocus: boolean
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
    setSelectionTransform = () => ({
      ok: false as const,
      reason: 'no-selection' as const,
    }),
    redo,
    rotateSelection,
    selectById,
    setCameraPreset,
    undo,
  } = commands
  const { requestOutlinerFocusByIndex, focusRoomView } = sync
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
    openStartOver,
    setCatalogOpen,
    pendingDeleteFurniture,
  } = dialogState
  const {
    clearPreview,
    clearEditorMessage,
    setEditorMessage,
    selectedSource,
    setSelectedSource,
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
  const outlinerFocusRequest = useOutlinerFocusRequest()

  // URL/draft restore runs only once per page load, even across scene remounts.
  const restoreAttemptedRef = useRef(false)

  // When selection is triggered programmatically (e.g. handleSelectById), this
  // ref is set before the scene/store selection update lands so the selectedId
  // reconciliation effect can attribute the next selection change correctly.
  const pendingSelectionSourceRef = useRef<InteractionSource>(null)

  // Tracks the last selected ID reconciled from the scene read model so we can
  // ignore rerenders that do not actually change selection identity.
  const previousReconciledSelectedIdRef = useRef<string | null>(null)
  const previousSelectionSideEffectSelectedIdRef = useRef<string | null>(
    sceneReadModel.selectedId,
  )
  const pendingPostDeleteOutlinerFocusIndexRef = useRef<number | null>(null)
  const pendingSelectionChangeBehaviorRef =
    useRef<PendingSelectionChangeBehavior | null>(null)
  const pendingDeleteFocusTargetRef = useRef<'room-view' | 'outliner' | null>(
    null,
  )

  const handleAddFurniture = useCallback(() => {
    clearEditorMessage()
    const added = addFurniture()

    if (added) {
      pendingSelectionSourceRef.current = 'toolbar'
      pendingSelectionChangeBehaviorRef.current = {
        announceMode: 'added',
        requestOutlinerFocus: false,
      }
      setSelectedSource('toolbar')
    } else {
      pendingSelectionSourceRef.current = null
      pendingSelectionChangeBehaviorRef.current = null
    }

    return added
  }, [addFurniture, clearEditorMessage, setSelectedSource])

  const handleCanvasPointerSelection = useCallback(
    (id: string) => {
      if (!editorInteractionsEnabled) {
        return
      }

      pendingSelectionChangeBehaviorRef.current =
        sceneReadModel.selectedId === id
          ? null
          : {
              announceMode: 'default',
              requestOutlinerFocus: false,
            }
      pendingSelectionSourceRef.current =
        sceneReadModel.selectedId === id ? null : 'canvas-pointer'
      setSelectedSource('canvas-pointer')
    },
    [editorInteractionsEnabled, sceneReadModel.selectedId, setSelectedSource],
  )

  const handleSelectById = useCallback(
    (id: string | null, source?: InteractionSource): SelectByIdResult => {
      const selectionWillChange = sceneReadModel.selectedId !== id
      const result = selectById(id)
      clearEditorMessage()

      if (result.ok && selectionWillChange) {
        pendingSelectionChangeBehaviorRef.current = {
          announceMode:
            source === 'panel-keyboard'
              ? 'panel-keyboard'
              : source === 'canvas-keyboard'
                ? 'canvas-keyboard'
                : 'default',
          requestOutlinerFocus: false,
        }
      } else {
        pendingSelectionChangeBehaviorRef.current = null
      }

      if (source) {
        if (result.ok) {
          if (selectionWillChange) {
            pendingSelectionSourceRef.current = source
          } else {
            pendingSelectionSourceRef.current = null
          }

          setSelectedSource(source)
        } else {
          pendingSelectionSourceRef.current = null
        }
      }

      return result
    },
    [
      sceneReadModel.selectedId,
      selectById,
      clearEditorMessage,
      setSelectedSource,
    ],
  )

  const handleMoveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      const movedItemName = selectedFurniture?.name ?? null

      clearEditorMessage()
      const result = moveSelection(delta, options)

      if (result.ok) {
        if (movedItemName) {
          queueMovementAnnouncement(
            `${movedItemName} moved to X ${formatCoordinate(result.position[0])} and Z ${formatCoordinate(result.position[2])}.`,
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
      clearEditorMessage,
      queueMovementAnnouncement,
      selectedFurniture,
    ],
  )

  const handleRotateSelection = useCallback(
    (direction: -1 | 1) => {
      const rotatingName = selectedFurniture?.name ?? null

      clearEditorMessage()
      rotateSelection(direction)

      if (rotatingName) {
        announcePolite(`${rotatingName} rotated.`)
      }
    },
    [rotateSelection, clearEditorMessage, announcePolite, selectedFurniture],
  )

  const handleInvalidSelectedItemDetailValue = useCallback(
    (fieldLabel: string) => {
      return formatSelectedItemDetailsInvalidValueMessage(fieldLabel)
    },
    [],
  )

  const handleUpdateSelectedItemDetails = useCallback(
    (
      input: UpdateSelectedItemDetailsInput,
    ): UpdateSelectedItemDetailsResult => {
      clearEditorMessage()

      const activeItem = selectedFurniture

      if (!activeItem) {
        const message = formatSelectedItemDetailsBlockedMessage(
          input.fieldLabel,
          'no-selection',
        )

        return {
          ok: false,
          reason: 'no-selection' as const,
          message,
        }
      }

      const nextPosition: [number, number, number] | undefined =
        input.field === 'positionX'
          ? resolvePositionFromWallClearances(activeItem, { left: input.value })
          : input.field === 'positionZ'
            ? resolvePositionFromWallClearances(activeItem, {
                back: input.value,
              })
            : undefined
      const nextRotationY =
        input.field === 'rotationDegrees'
          ? normalizeDegreesRadians(input.value)
          : undefined

      const result = setSelectionTransform({
        position: nextPosition,
        rotationY: nextRotationY,
      })

      if (result.ok) {
        setSelectedSource('panel-keyboard')
        announcePolite(`${result.item.name} details updated.`)

        return {
          ok: true,
          item: result.item,
        }
      }

      if (result.reason === 'no-op') {
        return {
          ok: false,
          reason: 'no-op',
        }
      }

      const message = formatSelectedItemDetailsBlockedMessage(
        input.fieldLabel,
        result.reason,
      )

      return {
        ok: false,
        reason: result.reason,
        message,
      }
    },
    [
      announcePolite,
      clearEditorMessage,
      selectedFurniture,
      setSelectedSource,
      setSelectionTransform,
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
    pendingSelectionChangeBehaviorRef.current = deleted
      ? {
          announceMode: 'suppress',
          requestOutlinerFocus: false,
        }
      : null

    if (deleted) {
      const pendingFocusTarget = pendingDeleteFocusTargetRef.current
      pendingDeleteFocusTargetRef.current = null
      const isCanvasSource =
        selectedSource === 'canvas-keyboard' ||
        selectedSource === 'canvas-pointer'
      const shouldFocusRoomView =
        pendingFocusTarget === 'room-view' ||
        (pendingFocusTarget === null && isCanvasSource)

      if (shouldFocusRoomView) {
        pendingPostDeleteOutlinerFocusIndexRef.current = null
        focusRoomView()
      } else {
        pendingPostDeleteOutlinerFocusIndexRef.current =
          deletedIndex >= 0 ? deletedIndex : 0
      }

      if (deletedName) {
        announcePolite(`${deletedName} removed from room.`)
      }
    }

    return null
  }, [
    confirmDeleteSelection,
    announcePolite,
    focusRoomView,
    closeDialog,
    pendingDeleteFurniture,
    sceneReadModel.items,
    selectedSource,
  ])

  const handleUndo = useCallback(() => {
    const undid = undo()
    pendingSelectionChangeBehaviorRef.current = undid
      ? {
          announceMode: 'suppress',
          requestOutlinerFocus: true,
        }
      : null
    clearEditorMessage()
    if (undid) {
      announcePolite('Undo complete.')
    }
  }, [undo, clearEditorMessage, announcePolite])

  const handleRedo = useCallback(() => {
    const redid = redo()
    pendingSelectionChangeBehaviorRef.current = redid
      ? {
          announceMode: 'suppress',
          requestOutlinerFocus: true,
        }
      : null
    clearEditorMessage()
    if (redid) {
      announcePolite('Redo complete.')
    }
  }, [redo, clearEditorMessage, announcePolite])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    pendingSelectionChangeBehaviorRef.current = {
      announceMode: 'default',
      requestOutlinerFocus: false,
    }
    clearEditorMessage()
  }, [clearSelection, clearEditorMessage])

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
      pendingDeleteFocusTargetRef.current = 'outliner'
      clearEditorMessage()
    } else {
      pendingDeleteFocusTargetRef.current = null
    }
  }, [openDelete, clearEditorMessage])

  const handleOpenDeleteDialogFromRoomView = useCallback(() => {
    const opened = openDelete()

    if (opened) {
      pendingDeleteFocusTargetRef.current = 'room-view'
      clearEditorMessage()
    } else {
      pendingDeleteFocusTargetRef.current = null
    }
  }, [openDelete, clearEditorMessage])

  const handleOpenStartOverDialog = useCallback(
    (options?: DialogOpenOptions) => {
      const opened = openStartOver(options)

      if (opened) {
        clearEditorMessage()
      }
    },
    [openStartOver, clearEditorMessage],
  )

  const handleConfirmStartOver = useCallback(() => {
    closeDialog()
    clearPreview()
    clearEditorMessage()
    restoreInitialLayout([])
    setFloorFinishId(defaultFloorFinishId)
    setWallFinishId(defaultWallFinishId)
    setCameraPreset('corner')
    clearSceneDraft()
    pendingSelectionChangeBehaviorRef.current = {
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    }
    announcePolite('Started over. Your changes were cleared.')
    toast.success('Started over. Your changes were cleared.')
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
    announcePolite,
  ])

  useEffect(() => {
    const preferredIndex = pendingPostDeleteOutlinerFocusIndexRef.current

    if (preferredIndex === null) {
      return
    }

    pendingPostDeleteOutlinerFocusIndexRef.current = null
    requestOutlinerFocusByIndex(preferredIndex)
  }, [requestOutlinerFocusByIndex, sceneReadModel.items])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    const newId = sceneReadModel.selectedId

    if (newId === previousReconciledSelectedIdRef.current) {
      return
    }

    const pendingSource = pendingSelectionSourceRef.current
    pendingSelectionSourceRef.current = null
    previousReconciledSelectedIdRef.current = newId

    setSelectedSource(newId === null ? null : pendingSource)
  }, [editorInteractionsEnabled, sceneReadModel.selectedId, setSelectedSource])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    const newId = sceneReadModel.selectedId
    const previousSelectedId = previousSelectionSideEffectSelectedIdRef.current

    if (newId === previousSelectedId) {
      return
    }

    const pendingBehavior = pendingSelectionChangeBehaviorRef.current ?? {
      announceMode: 'default' as const,
      requestOutlinerFocus: false,
    }
    pendingSelectionChangeBehaviorRef.current = null

    if (pendingBehavior.announceMode === 'added') {
      const selectedItem = newId
        ? sceneReadModel.items.find((item) => item.id === newId)
        : null

      if (selectedItem) {
        announcePolite(`${selectedItem.name} added to room.`)
      }
    } else if (pendingBehavior.announceMode === 'panel-keyboard') {
      const selectedItem = newId
        ? sceneReadModel.items.find((item) => item.id === newId)
        : null

      if (selectedItem) {
        announcePolite(
          `${selectedItem.name} selected. Press Shift+Tab to reach selected item actions and details.`,
        )
      }
    } else if (pendingBehavior.announceMode === 'canvas-keyboard') {
      if (newId) {
        const selectedItem = sceneReadModel.items.find(
          (item) => item.id === newId,
        )

        if (selectedItem) {
          announcePolite(
            `${selectedItem.name} selected. Press Tab to reach selected item actions and details.`,
          )
        }
      } else if (previousSelectedId) {
        announcePolite('Selection cleared.')
      }
    } else if (pendingBehavior.announceMode === 'default') {
      if (newId) {
        const selectedItem = sceneReadModel.items.find(
          (item) => item.id === newId,
        )

        if (selectedItem) {
          announcePolite(`${selectedItem.name} selected.`)
        }
      } else if (previousSelectedId) {
        announcePolite('Selection cleared.')
      }
    }

    if (pendingBehavior.requestOutlinerFocus && outlinerFocusRequest === null) {
      if (newId) {
        selectionMetaActions.requestOutlinerFocus({
          token: Date.now(),
          targetSelectedId: newId,
        })
      } else if (previousSelectedId) {
        selectionMetaActions.requestOutlinerFocus({
          token: Date.now(),
          focusContainer: true,
        })
      }
    }

    previousSelectionSideEffectSelectedIdRef.current = newId
  }, [
    announcePolite,
    editorInteractionsEnabled,
    outlinerFocusRequest,
    sceneReadModel.items,
    sceneReadModel.selectedId,
  ])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (
      sceneReadModel.selectedId !==
      previousSelectionSideEffectSelectedIdRef.current
    ) {
      return
    }

    pendingSelectionChangeBehaviorRef.current = null
  }, [
    editorInteractionsEnabled,
    sceneReadModel.items,
    sceneReadModel.selectedId,
  ])

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
      editorRuntimeActions.incrementRestoreAttempt()

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

      const normalizeRestoredState = (state: RestorableState) => {
        const normalizedFloorFinishId = floorFinishIds.includes(
          state.floorFinishId ?? '',
        )
          ? state.floorFinishId
          : defaultFloorFinishId
        const normalizedWallFinishId = wallFinishIds.includes(
          state.wallFinishId ?? '',
        )
          ? state.wallFinishId
          : defaultWallFinishId

        return {
          ...state,
          floorFinishId: normalizedFloorFinishId,
          wallFinishId: normalizedWallFinishId,
        }
      }

      const applyRestoredState = (state: RestorableState) => {
        const normalizedState = normalizeRestoredState(state)

        restoreInitialLayout(normalizedState.items)
        applyFinishIds(
          normalizedState.floorFinishId,
          normalizedState.wallFinishId,
        )
        saveSceneDraft(normalizedState.items, {
          floorFinishId: normalizedState.floorFinishId,
          wallFinishId: normalizedState.wallFinishId,
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
        isFreshState: (state) => {
          const normalizedState = normalizeRestoredState(state)

          return isSceneStateAtDefaults(
            {
              items: normalizedState.items,
              floorFinishId: normalizedState.floorFinishId,
              wallFinishId: normalizedState.wallFinishId,
            },
            defaultSceneState,
          )
        },
        notifications: {
          announcePolite,
          announceAssertive,
          setEditorMessage: (message) => {
            setEditorMessage(message)
          },
          setRestoreOutcome: editorRuntimeActions.recordRestoreOutcome,
          toastSuccess: (message) => toast.success(message),
          toastWarning: (message) => toast.warning(message),
          toastError: (message) => toast.error(message),
        },
      })
    }

    pendingSelectionChangeBehaviorRef.current = {
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    }

    handleAssetsReady()
  }, [
    handleAssetsReady,
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

  const handleShareSceneUrl = useCallback(async () => {
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
      return null
    }

    const shareData = {
      title: 'Room Layout',
      url,
    }

    let canUseNativeShare = typeof navigator.share === 'function'

    if (canUseNativeShare && typeof navigator.canShare === 'function') {
      try {
        canUseNativeShare = navigator.canShare({ url: shareData.url })
      } catch {
        canUseNativeShare = false
      }
    }

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData)
        clearEditorMessage()
        announcePolite('Room layout shared.')
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null
        }

        setEditorMessage('Could not open share options.')
        announceAssertive('Could not open share options.')
        return null
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      clearEditorMessage()
      announcePolite('Scene URL copied to clipboard.')
      return 'copied'
    } catch {
      setEditorMessage('Could not copy URL to clipboard.')
      announceAssertive('Could not copy URL to clipboard.')
      return null
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
    handleCanvasPointerSelection,
    handleFocusSelected,
    handleSelectById,
    handleMoveSelection,
    handleRotateSelection,
    handleInvalidSelectedItemDetailValue,
    handleUpdateSelectedItemDetails,
    handleConfirmDeleteSelection,
    handleUndo,
    handleRedo,
    handleClearSelection,
    handleSetCameraPreset,
    handleCatalogDrawerOpenChange,
    handleOpenDeleteDialog,
    handleOpenDeleteDialogFromRoomView,
    handleOpenStartOverDialog,
    handleConfirmStartOver,
    handleSceneAssetError,
    handleSceneAssetsReady,
    handleRetryAssetLoading,
    handleShareSceneUrl,
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} meters`
}

function normalizeDegreesRadians(valueDegrees: number) {
  const normalizedDegrees = ((valueDegrees % 360) + 360) % 360
  const counterclockwiseDegrees = (360 - normalizedDegrees) % 360
  return (counterclockwiseDegrees * Math.PI) / 180
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

function formatSelectedItemDetailsBlockedMessage(
  fieldLabel: string,
  reason: Exclude<UpdateSelectionTransformResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return `${fieldLabel} must stay inside the room.`
    case 'blocked-collision':
      return `${fieldLabel} overlaps another item.`
    case 'dragging':
      return 'Finish dragging before editing item details.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}

function formatSelectedItemDetailsInvalidValueMessage(fieldLabel: string) {
  return `${fieldLabel} must be a valid number.`
}
