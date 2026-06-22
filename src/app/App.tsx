import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  dialogActions,
  useDialogPayload,
  useIsBlockingOverlayOpen,
} from '@/editor-state/dialog-store'
import type { AppDialogOpenRequest } from '@/app/dialogs/dialog-requests'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  sceneStateActions,
  useFloorFinishId,
  useItems,
  useSelectedFurniture,
  useWallFinishId,
} from '@/editor-state/scene-state-store'
import { announcementActions } from '@/editor-state/announcement-store'
import { usePreviewController } from '@/app/controllers/use-preview-controller'
import { useSelectionEffectsController } from '@/app/controllers/use-selection-effects-controller'
import { useSelectionController } from '@/app/controllers/use-selection-controller'
import { useMovementController } from '@/app/controllers/use-movement-controller'
import { useHistoryController } from '@/app/controllers/use-history-controller'
import { useDeletionController } from '@/app/controllers/use-deletion-controller'
import { useCatalogController } from '@/app/controllers/use-catalog-controller'
import { useStartOverController } from '@/app/controllers/use-start-over-controller'
import { useAssetLifecycleController } from '@/app/controllers/use-asset-lifecycle-controller'
import { useShareController } from '@/app/controllers/use-share-controller'
import { useCanvasKeyboardController } from '@/app/controllers/use-canvas-keyboard-controller'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { CommandDispatchProvider } from '@/editor-state/command-dispatch-provider'
import { useCommandDispatchValue } from '@/editor-state/command-dispatch-context'
import type { EditorCommandApi } from '@/editor-state/editor-command'
import {
  editorRuntimeActions,
  useAssetError,
  useEditorInteractionsEnabled,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from '@/editor-state/editor-runtime-store'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { isFreshSceneState } from '@/shared/lib/three/scene-defaults'
import { runStartupReset } from '@/features/startup/reset-startup-state'
import { useStartupState } from '@/features/startup/use-startup-state'
import { EditorBody } from './chrome/editor-body'
import { EditorShell } from './chrome/editor-shell'
import { findFirstActionableInspectorControl } from './chrome/focusable-controls'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  useOutlinerFocusRequest,
} from '@/editor-state/selection-meta-store'
import { useRequestOutlinerFocus } from '@/app/controllers/use-request-outliner-focus'
import { perfCounters } from '@/shared/debug/perf-counters'
import { useDraftPersistence } from '@/features/url-scene/use-draft-persistence'
import { sceneCommands } from '@/scene/scene-commands'
import { ROTATION_STEP_RADIANS } from '@/app/controllers/_shared/constants'
import { useActiveFinishIds } from '@/app/controllers/_shared/use-active-finish-ids'
import { useTestStateBridge } from './testing/use-test-state-bridge'
import {
  buildDialogRuntimeContext,
  bootstrapDialogRegistry,
} from './dialogs/bootstrap-dialog-registry'

function App() {
  if (import.meta.env.DEV) {
    perfCounters.incrAppRender()
  }
  const roomViewRef = useRef<HTMLElement | null>(null)
  const selectedItemControlsRef = useRef<HTMLDivElement | null>(null)
  const dockedInspectorRef = useRef<HTMLDivElement | null>(null)
  const roomViewFocusFrameRef = useRef<number | null>(null)
  const items = useItems()
  const selectedFurniture = useSelectedFurniture()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const [catalogIdToAdd, setCatalogIdToAdd] = useState('')
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const requestOutlinerFocus = useRequestOutlinerFocus()
  const isE2ELowRenderQuality =
    import.meta.env.DEV && import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'
  const canvasShadowMode = isE2ELowRenderQuality ? false : 'percentage'

  const resetOverlayShellState = useCallback(() => {
    sceneStateActions.resetSceneState()
    resetSelectionMetaStore()
  }, [])

  const {
    catalog,
    collections,
    environmentConfig: startupEnvironmentConfig,
    cacheInvalidationKey,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
  } = useStartupState()
  const assetError = useAssetError()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const startupLoadingActive = useStartupLoadingActive()
  const startupOverlayActive = useStartupOverlayActive()
  const startupPhase = useStartupPhase()

  const resetEditorShellState = useCallback(() => {
    runStartupReset({ resetOverlayState: resetOverlayShellState })
  }, [resetOverlayShellState])

  const startup = useMemo(
    () => ({
      assetError,
      assetErrorKind: assetError?.kind ?? null,
      assetsReady: startupPhase === 'ready',
      catalog,
      collections,
      environmentConfig: startupEnvironmentConfig,
      editorInteractionsEnabled,
      cacheInvalidationKey,
      startupLoadingActive,
      startupOverlayActive,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      resetEditorShellState,
    }),
    [
      assetError,
      startupPhase,
      catalog,
      collections,
      startupEnvironmentConfig,
      editorInteractionsEnabled,
      cacheInvalidationKey,
      startupLoadingActive,
      startupOverlayActive,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      resetEditorShellState,
    ],
  )

  const environmentConfig = startup.environmentConfig

  const {
    activeFloorFinishId,
    activeWallFinishId,
    selectedFloorOption,
    selectedWallOption,
  } = useActiveFinishIds({
    environmentConfig,
    floorFinishId,
    wallFinishId,
  })

  useDraftPersistence({
    environmentConfig,
  })

  const sceneIsAtDefaults = useMemo(() => {
    if (!environmentConfig) {
      return false
    }

    return isFreshSceneState(
      {
        items,
        floorFinishId: activeFloorFinishId,
        wallFinishId: activeWallFinishId,
      },
      environmentConfig,
    )
  }, [items, environmentConfig, activeFloorFinishId, activeWallFinishId])

  const dialogRuntimeContext = useMemo(
    () =>
      buildDialogRuntimeContext({
        canStartOver: () => true,
      }),
    [],
  )
  useEffect(() => {
    bootstrapDialogRegistry(dialogRuntimeContext)
  }, [dialogRuntimeContext])

  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const pendingDeleteFurniture = useDialogPayload(
    DIALOG_IDS.delete,
  ) as FurnitureItem | null

  const selectionEffects = useSelectionEffectsController({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const wasBlockingOverlayOpenRef = useRef(isBlockingOverlayOpen)

  const activeCatalogIdToAdd = useMemo(() => {
    if (catalogIdToAdd) {
      const exists = startup.catalog.some(
        (entry) => entry.id === catalogIdToAdd,
      )
      if (exists) {
        return catalogIdToAdd
      }
    }

    return startup.catalog[0]?.id ?? ''
  }, [catalogIdToAdd, startup.catalog])

  const {
    previewedId,
    handleScenePreviewChange,
    handleOutlinerPreviewChange,
    handleCanvasKeyboardPreviewChange: applyCanvasKeyboardPreviewChange,
    clearPreviewOnCanvasMiss,
  } = usePreviewController({
    isBlockingOverlayOpen,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })

  const focusRoomView = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    if (roomViewFocusFrameRef.current !== null) {
      cancelAnimationFrame(roomViewFocusFrameRef.current)
    }

    roomViewFocusFrameRef.current = requestAnimationFrame(() => {
      roomViewFocusFrameRef.current = null
      roomViewRef.current?.focus()
    })
  }, [startup.editorInteractionsEnabled])

  useEffect(() => {
    return () => {
      if (roomViewFocusFrameRef.current !== null) {
        cancelAnimationFrame(roomViewFocusFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const wasBlockingOverlayOpen = wasBlockingOverlayOpenRef.current
    wasBlockingOverlayOpenRef.current = isBlockingOverlayOpen

    if (
      !isBlockingOverlayOpen ||
      wasBlockingOverlayOpen ||
      outlinerFocusRequest === null
    ) {
      return
    }

    selectionMetaActions.clearOutlinerFocusRequest()
  }, [isBlockingOverlayOpen, outlinerFocusRequest])

  const selectionController = useSelectionController({
    selectionEffects,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const { handleSelectById } = selectionController
  const movementController = useMovementController({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    rotationStepRadians: ROTATION_STEP_RADIANS,
  })
  const historyController = useHistoryController({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    selectionEffects,
  })
  const deletionController = useDeletionController({
    closeActiveDialog: dialogActions.closeActiveDialog,
    openDeleteDialog: () => dialogActions.openDialog(DIALOG_IDS.delete),
    pendingDeleteFurniture,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    selectionEffects,
    focusRoomView,
  })
  const catalogController = useCatalogController({
    setCatalogOpen: (open) =>
      dialogActions.setDialogOpen(DIALOG_IDS.catalog, open),
    selectionEffects,
    catalogIdToAdd: activeCatalogIdToAdd,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const startOverController = useStartOverController({
    closeActiveDialog: dialogActions.closeActiveDialog,
    openStartOverDialog: (request?: AppDialogOpenRequest) =>
      dialogActions.openDialog(DIALOG_IDS.startOver, request),
    canStartOver: !sceneIsAtDefaults,
    selectionEffects,
    clearPreview: clearPreviewOnCanvasMiss,
    defaults: {
      floorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
      wallFinishId: environmentConfig?.defaultWallFinishId ?? '',
    },
  })
  const assetLifecycleController = useAssetLifecycleController({
    closeActiveDialog: dialogActions.closeActiveDialog,
    selectionEffects,
    startup: {
      catalog: startup.catalog,
      defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
      defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
      floorFinishIds:
        environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
      wallFinishIds:
        environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
      handleAssetError: startup.handleAssetError,
      handleAssetsReady: startup.handleAssetsReady,
      retryAssetLoading: startup.retryAssetLoading,
      resetEditorShellState: startup.resetEditorShellState,
    },
  })
  const shareController = useShareController({
    activeFloorFinishId,
    activeWallFinishId,
  })
  const handleSetCameraPreset = useCallback(
    (preset: 'corner' | 'front' | 'side' | 'top') => {
      if (!startup.editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
        return
      }

      sceneCommands.setCameraPreset(preset)
    },
    [startup.editorInteractionsEnabled],
  )
  const handleFocusSelected = useCallback(() => {
    if (!startup.editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
      return
    }

    sceneCommands.focusSelected()
  }, [startup.editorInteractionsEnabled])
  const handleFloorLoadingChange = useCallback((loading: boolean) => {
    editorRuntimeActions.setFloorFinishLoading(loading)
  }, [])
  const handlers = {
    ...selectionController,
    ...movementController,
    ...historyController,
    ...deletionController,
    ...catalogController,
    ...startOverController,
    ...assetLifecycleController,
    ...shareController,
    handleSetCameraPreset,
    handleFocusSelected,
  }

  const editorRefs = useMemo(
    () => ({ roomViewRef, selectedItemControlsRef, dockedInspectorRef }),
    [],
  )

  const { previewedIdRef, handleCanvasBrowse, handleCanvasSelectPreviewed } =
    useCanvasKeyboardController({
      previewedId,
      applyCanvasKeyboardPreviewChange,
      handleSelectById,
    })

  const handleFocusInspector = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    if (selectedFurniture === null) {
      requestOutlinerFocus()
      announcementActions.announcePolite(
        'No item selected. Focus moved to Furniture in room.',
      )
      return
    }

    const firstFocusableControl = findFirstActionableInspectorControl(
      dockedInspectorRef.current,
    )

    firstFocusableControl?.focus()
  }, [
    dockedInspectorRef,
    requestOutlinerFocus,
    selectedFurniture,
    startup.editorInteractionsEnabled,
  ])

  const handleFocusRoomView = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    focusRoomView()

    if (selectedFurniture !== null) {
      applyCanvasKeyboardPreviewChange(selectedFurniture.id)
    }
  }, [
    applyCanvasKeyboardPreviewChange,
    focusRoomView,
    selectedFurniture,
    startup.editorInteractionsEnabled,
  ])

  const handleFocusOutliner = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    requestOutlinerFocus()
  }, [requestOutlinerFocus, startup.editorInteractionsEnabled])

  useTestStateBridge({
    activeFloorFinishId,
    activeWallFinishId,
    previewedIdRef,
    setTestOverlaysHidden,
  })

  const commandApi: EditorCommandApi = {
    focusInspector: handleFocusInspector,
    focusRoomView: handleFocusRoomView,
    focusOutliner: handleFocusOutliner,
    undo: handlers.handleUndo,
    redo: handlers.handleRedo,
    startOverIntent: handlers.handleOpenStartOverDialog,
    openDeleteDialog: (returnFocusTo) => {
      if (returnFocusTo === 'room-view') {
        handlers.handleOpenDeleteDialogFromRoomView()
      } else {
        handlers.handleOpenDeleteDialog()
      }
    },
    focusSelected: handlers.handleFocusSelected,
    moveSelection: (delta) => {
      handlers.handleMoveSelection(delta, { source: 'keyboard' })
    },
    clearSelection: () => {
      handlers.handleClearSelection()
      clearPreviewOnCanvasMiss()
    },
    rotate: handlers.handleRotateSelection,
    setCameraPreset: handlers.handleSetCameraPreset,
    canvasBrowse: handleCanvasBrowse,
    canvasSelectPreviewed: handleCanvasSelectPreviewed,
    share: () => {
      void handlers.handleShareSceneUrl()
    },
  }

  const dispatchCommand = useCommandDispatchValue(commandApi)

  return (
    <TooltipProvider>
      <EditorRefsProvider value={editorRefs}>
        <CommandDispatchProvider value={dispatchCommand}>
          <EditorShell>
            <EditorBody
              catalog={startup.catalog}
              collections={startup.collections}
              cacheInvalidationKey={startup.cacheInvalidationKey}
              testOverlaysHidden={testOverlaysHidden}
              sceneIsAtDefaults={sceneIsAtDefaults}
              focusRoomView={focusRoomView}
              canvasShadowMode={canvasShadowMode}
              isE2ELowRenderQuality={isE2ELowRenderQuality}
              previewedId={previewedId}
              selectedFloorOption={selectedFloorOption}
              selectedWallOption={selectedWallOption}
              clearPreviewOnCanvasMiss={clearPreviewOnCanvasMiss}
              onScenePreviewChange={handleScenePreviewChange}
              onFloorLoadingChange={handleFloorLoadingChange}
              onCanvasPointerSelection={handlers.handleCanvasPointerSelection}
              onSceneAssetsReady={handlers.handleSceneAssetsReady}
              onSceneAssetError={handlers.handleSceneAssetError}
              onClearSelection={handlers.handleClearSelection}
              editorOverlay={{
                startOverDisabled: sceneIsAtDefaults,
                topHeader: {
                  catalog: startup.catalog,
                  environmentConfig,
                  catalogIdToAdd: activeCatalogIdToAdd,
                  onAddFurniture: handlers.handleAddFurniture,
                  onCatalogIdToAddChange: setCatalogIdToAdd,
                  onCatalogDrawerOpenChange:
                    handlers.handleCatalogDrawerOpenChange,
                  onShareSceneUrl: handlers.handleShareSceneUrl,
                  onOpenStartOverDialog: handlers.handleOpenStartOverDialog,
                  onConfirmStartOver: handlers.handleConfirmStartOver,
                },
                outliner: {
                  onSelectById: handlers.handleSelectById,
                  onPreviewChange: handleOutlinerPreviewChange,
                },
                onConfirmDeleteSelection: handlers.handleConfirmDeleteSelection,
                onRetryAssetLoading: handlers.handleRetryAssetLoading,
              }}
            />
          </EditorShell>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}

export default App
