import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  Suspense,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { EditorOverlay } from './app/overlay/editor-overlay'
import { useDialogStateSnapshot } from './app/hooks/use-dialog-state-snapshot'
import {
  sceneStateActions,
  useFloorFinishId,
  useItems,
  useSelectedFurniture,
  useWallFinishId,
} from './editor-state/scene-state-store'
import { useKeyboardShortcuts } from './app/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from './app/keyboard/use-camera-key-state'
import { useAnnouncements } from './app/hooks/use-announcements'
import { usePreviewController } from './app/controllers/use-preview-controller'
import { useSelectionEffectsController } from './app/controllers/use-selection-effects-controller'
import { useSelectionController } from './app/controllers/use-selection-controller'
import { useMovementController } from './app/controllers/use-movement-controller'
import { useHistoryController } from './app/controllers/use-history-controller'
import { useDeletionController } from './app/controllers/use-deletion-controller'
import { useCatalogController } from './app/controllers/use-catalog-controller'
import { useStartOverController } from './app/controllers/use-start-over-controller'
import { useAssetLifecycleController } from './app/controllers/use-asset-lifecycle-controller'
import { useShareController } from './app/controllers/use-share-controller'
import { useCanvasKeyboardController } from './app/controllers/use-canvas-keyboard-controller'
import { EditorRefsProvider } from './app/contexts/editor-refs-context'
import { OverlayLayoutProvider } from './app/contexts/overlay-layout-context'
import {
  editorRuntimeActions,
  useAssetError,
  useEditorInteractionsEnabled,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from './editor-state/editor-runtime-store'
import { Announcer } from './app/scene-panel/announcer'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { isFreshSceneState } from './app/startup/scene-defaults'
import { runStartupReset } from './app/startup/reset-startup-state'
import { useStartupState } from './app/startup/use-startup-state'
import { FloatingSelectedItemSite } from './app/selection/floating-selected-item-site'
import { useComputeSelectedItemPlacement } from './app/selection/use-compute-selected-item-placement'
import { SelectedItemPlacementProvider } from './app/selection/use-selected-item-placement-context'
import { SelectedItemInteractionProvider } from './app/selection/selected-item-interaction-context'
import { findFirstFocusableControl } from './app/overlay/focusable-controls'
import { useOverlayExclusionRects } from './app/overlay/use-overlay-exclusion-rects'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  useOutlinerFocusRequest,
} from './editor-state/selection-meta-store'
import { perfCounters } from '@/lib/debug/perf-counters'
import { useDraftPersistence } from './app/use-draft-persistence'
import { sceneCommands } from './scene/scene-commands'
import { ROTATION_STEP_RADIANS } from './app/controllers/_shared/constants'
import { useActiveFinishIds } from './app/controllers/_shared/use-active-finish-ids'
import { useTestStateBridge } from './app/test/use-test-state-bridge'

class SceneAssetErrorBoundary extends Component<
  {
    children: ReactNode
    onError: (error: Error) => void
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

function SelectedItemPlacementShell({
  isCatalogDrawerOpen,
  startupOverlayActive,
  children,
}: {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  children: ReactNode
}) {
  const { placement, actionsSizeRef } = useComputeSelectedItemPlacement({
    isCatalogDrawerOpen,
    startupOverlayActive,
  })
  const value = useMemo(
    () => ({ placement, actionsSizeRef }),
    [placement, actionsSizeRef],
  )

  return (
    <SelectedItemPlacementProvider value={value}>
      <SelectedItemInteractionProvider>
        {children}
      </SelectedItemInteractionProvider>
    </SelectedItemPlacementProvider>
  )
}

function App() {
  if (import.meta.env.DEV) {
    perfCounters.incrAppRender()
  }
  const roomViewRef = useRef<HTMLElement | null>(null)
  const selectedItemControlsRef = useRef<HTMLDivElement | null>(null)
  const roomViewFocusFrameRef = useRef<number | null>(null)
  const items = useItems()
  const selectedFurniture = useSelectedFurniture()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const [catalogIdToAdd, setCatalogIdToAdd] = useState('')
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const isE2ELowRenderQuality =
    import.meta.env.DEV && import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'
  const canvasShadowMode = isE2ELowRenderQuality ? false : 'percentage'
  const overlayExclusions = useOverlayExclusionRects()

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

  const announcements = useAnnouncements()

  const dialogState = useDialogStateSnapshot({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    startupOverlayActive: startup.startupOverlayActive,
    selectedFurniture,
    canStartOver: !sceneIsAtDefaults,
  })
  const selectionEffects = useSelectionEffectsController({
    announcements,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const wasBlockingOverlayOpenRef = useRef(dialogState.isBlockingOverlayOpen)

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
    isBlockingOverlayOpen: dialogState.isBlockingOverlayOpen,
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
    wasBlockingOverlayOpenRef.current = dialogState.isBlockingOverlayOpen

    if (
      !dialogState.isBlockingOverlayOpen ||
      wasBlockingOverlayOpen ||
      outlinerFocusRequest === null
    ) {
      return
    }

    selectionMetaActions.clearOutlinerFocusRequest()
  }, [dialogState.isBlockingOverlayOpen, outlinerFocusRequest])

  const selectionController = useSelectionController({
    selectionEffects,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const { handleSelectById } = selectionController
  const movementController = useMovementController({
    announcements,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    rotationStepRadians: ROTATION_STEP_RADIANS,
  })
  const historyController = useHistoryController({
    announcements,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    selectionEffects,
  })
  const deletionController = useDeletionController({
    announcements,
    dialogState,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    selectionEffects,
    focusRoomView,
  })
  const catalogController = useCatalogController({
    dialogState,
    selectionEffects,
    catalogIdToAdd: activeCatalogIdToAdd,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })
  const startOverController = useStartOverController({
    announcements,
    dialogState,
    selectionEffects,
    clearPreview: clearPreviewOnCanvasMiss,
    defaults: {
      floorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
      wallFinishId: environmentConfig?.defaultWallFinishId ?? '',
    },
  })
  const assetLifecycleController = useAssetLifecycleController({
    announcements,
    dialogState,
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
    announcements,
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

  const { clearQueuedMovementAnnouncement } = announcements
  const editorRefs = useMemo(
    () => ({ roomViewRef, selectedItemControlsRef }),
    [],
  )
  const overlayLayout = useMemo(
    () => ({
      exclusionRects: overlayExclusions.rects,
      registerExclusionElement: overlayExclusions.registerExclusionElement,
      syncLayoutMode: dialogState.syncLayoutMode,
    }),
    [
      overlayExclusions.rects,
      overlayExclusions.registerExclusionElement,
      dialogState.syncLayoutMode,
    ],
  )

  useEffect(() => {
    return () => {
      clearQueuedMovementAnnouncement()
    }
  }, [clearQueuedMovementAnnouncement])

  const { previewedIdRef, handleCanvasBrowse, handleCanvasSelectPreviewed } =
    useCanvasKeyboardController({
      previewedId,
      applyCanvasKeyboardPreviewChange,
      handleSelectById,
      announcements,
    })

  const handleNavigateBackToSelectionControls = useCallback(() => {
    const firstFocusableControl = findFirstFocusableControl(
      selectedItemControlsRef.current,
    )

    if (!firstFocusableControl) {
      return false
    }

    firstFocusableControl.focus()
    return true
  }, [])

  useTestStateBridge({
    activeFloorFinishId,
    activeWallFinishId,
    previewedIdRef,
    setTestOverlaysHidden,
  })

  useKeyboardShortcuts({
    enabled: startup.editorInteractionsEnabled,
    hasSelection: selectedFurniture !== null,
    isBlockingOverlayOpen: dialogState.isBlockingOverlayOpen,
    canStartOver: !sceneIsAtDefaults,
    roomViewHasFocus,
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    onStartOverIntent: handlers.handleOpenStartOverDialog,
    onOpenDeleteDialog: handlers.handleOpenDeleteDialogFromRoomView,
    onFocusSelected: handlers.handleFocusSelected,
    onMoveSelection: (delta) => {
      handlers.handleMoveSelection(delta, { source: 'keyboard' })
    },
    onClearSelection: () => {
      handlers.handleClearSelection()
      clearPreviewOnCanvasMiss()
    },
    onRotate: handlers.handleRotateSelection,
    onSetCameraPreset: handlers.handleSetCameraPreset,
    onCanvasBrowse: handleCanvasBrowse,
    onCanvasSelectPreviewed: handleCanvasSelectPreviewed,
  })

  useCameraKeyState({
    enabled: startup.editorInteractionsEnabled,
    isBlockingOverlayOpen: dialogState.isBlockingOverlayOpen,
    roomViewHasFocus,
  })

  return (
    <TooltipProvider>
      <EditorRefsProvider value={editorRefs}>
        <OverlayLayoutProvider value={overlayLayout}>
          <SelectedItemPlacementShell
            isCatalogDrawerOpen={dialogState.isCatalogDrawerOpen}
            startupOverlayActive={startup.startupOverlayActive}
          >
            <main
              className="relative size-full"
              aria-busy={startup.startupLoadingActive}
              data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
            >
              <h1 className="sr-only">Room Layout</h1>
              <p id="scene-instructions" className="sr-only">
                Interactive 3D room editor. Tab to focus the room-view region,
                then use the arrow keys to preview items in the room and Enter
                or Space to select the previewed item. You can also use the
                furniture in room panel and selected item actions and details to
                rotate, remove, or type exact placement changes without
                dragging. When focus is in the furniture in room panel, press
                Shift+Tab to return to selected item actions and details.
              </p>
              <section
                aria-describedby="scene-instructions"
                aria-label="Interactive 3D room editor"
                ref={roomViewRef}
                tabIndex={startup.editorInteractionsEnabled ? 0 : -1}
                className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onFocus={() => {
                  flushSync(() => {
                    setRoomViewHasFocus(true)
                  })
                }}
                onBlur={() => {
                  flushSync(() => {
                    setRoomViewHasFocus(false)
                  })
                }}
                onPointerDownCapture={focusRoomView}
              >
                <Canvas
                  className="absolute inset-0 z-0"
                  camera={{
                    position: [3, 2.5, 3],
                    fov: 50,
                  }}
                  frameloop="demand"
                  onCreated={({ gl }) => {
                    gl.outputColorSpace = SRGBColorSpace
                    gl.toneMapping = NeutralToneMapping
                    gl.toneMappingExposure = isE2ELowRenderQuality ? 1 : 1.05
                  }}
                  onPointerMissed={() => {
                    if (!startup.editorInteractionsEnabled) {
                      return
                    }

                    focusRoomView()
                    clearPreviewOnCanvasMiss()
                    handlers.handleClearSelection()
                  }}
                  shadows={canvasShadowMode}
                >
                  <SceneAssetErrorBoundary
                    key={startup.cacheInvalidationKey}
                    onError={handlers.handleSceneAssetError}
                  >
                    <Suspense fallback={null}>
                      <Scene
                        renderQuality={
                          isE2ELowRenderQuality ? 'e2e-low' : 'default'
                        }
                        catalog={startup.catalog}
                        collections={startup.collections}
                        onCanvasPointerSelection={
                          handlers.handleCanvasPointerSelection
                        }
                        onAssetsReady={handlers.handleSceneAssetsReady}
                        previewedId={previewedId}
                        onPreviewChange={handleScenePreviewChange}
                        floorOption={selectedFloorOption}
                        wallOption={selectedWallOption}
                        onFloorLoadingChange={handleFloorLoadingChange}
                      />
                    </Suspense>
                  </SceneAssetErrorBoundary>
                </Canvas>
              </section>

              {testOverlaysHidden ? null : (
                <>
                  <FloatingSelectedItemSite
                    onOpenDeleteDialog={handlers.handleOpenDeleteDialog}
                    onRotateSelection={handlers.handleRotateSelection}
                  />

                  <EditorOverlay
                    startOverDisabled={sceneIsAtDefaults}
                    onHeaderLayoutModeChange={dialogState.syncLayoutMode}
                    topHeader={{
                      catalog: startup.catalog,
                      environmentConfig,
                      catalogIdToAdd: activeCatalogIdToAdd,
                      onAddFurniture: handlers.handleAddFurniture,
                      onCatalogIdToAddChange: setCatalogIdToAdd,
                      onCatalogDrawerOpenChange:
                        handlers.handleCatalogDrawerOpenChange,
                      onUndo: handlers.handleUndo,
                      onRedo: handlers.handleRedo,
                      onShareSceneUrl: handlers.handleShareSceneUrl,
                      onOpenStartOverDialog: handlers.handleOpenStartOverDialog,
                      onConfirmStartOver: handlers.handleConfirmStartOver,
                    }}
                    outliner={{
                      onNavigateBackToSelectionControls:
                        handleNavigateBackToSelectionControls,
                      onSelectById: handlers.handleSelectById,
                      onPreviewChange: handleOutlinerPreviewChange,
                    }}
                    cameraTools={{
                      onSetCameraPreset: handlers.handleSetCameraPreset,
                      onFocusSelected: handlers.handleFocusSelected,
                    }}
                    dockedSelectedItem={{
                      onOpenDeleteDialog: handlers.handleOpenDeleteDialog,
                      onRotateSelection: handlers.handleRotateSelection,
                      onInvalidSelectedItemDetailValue:
                        handlers.handleInvalidSelectedItemDetailValue,
                      onUpdateSelectedItemDetails:
                        handlers.handleUpdateSelectedItemDetails,
                    }}
                    onConfirmDeleteSelection={
                      handlers.handleConfirmDeleteSelection
                    }
                    onRetryAssetLoading={handlers.handleRetryAssetLoading}
                  />
                </>
              )}
              <Announcer
                politeMessage={announcements.politeAnnouncement}
                assertiveMessage={announcements.assertiveAnnouncement}
              />
              <Toaster />
            </main>
          </SelectedItemPlacementShell>
        </OverlayLayoutProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}

export default App
