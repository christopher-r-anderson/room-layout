import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import {
  Component,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import {
  findFloorFinishOption,
  findWallFinishOption,
} from './lib/three/environment-materials'
import { EditorOverlay } from './app/overlay/editor-overlay'
import { useDialogStateSnapshot } from './editor-state/dialog-store'
import {
  sceneStateActions,
  sceneStateStore,
  useEditorMessage,
  useFloorFinishId,
  useHistoryAvailability,
  useItems,
  useSceneReadModel,
  useSelectedFurniture,
  useWallFinishId,
} from './editor-state/scene-state-store'
import { useKeyboardShortcuts } from './app/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from './app/keyboard/use-camera-key-state'
import { useOverlayProps } from './app/overlay/use-overlay-props'
import { useAnnouncements } from './app/hooks/use-announcements'
import { usePreviewController } from './app/use-preview-controller'
import { useSceneHandlers } from './app/use-scene-handlers'
import {
  editorRuntimeStore,
  type RestoreOutcome,
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
import { sortSpatially } from './lib/three/spatial-sort'
import { SelectedItemControls } from './app/selection/selected-item-controls'
import { findFirstFocusableControl } from './app/overlay/focusable-controls'
import { useOverlayExclusionRects } from './app/overlay/use-overlay-exclusion-rects'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  useOutlinerFocusRequest,
  useSelectedSource,
  useToolbarGeometry,
} from './editor-state/selection-meta-store'
import {
  type PerfCounterSnapshot,
  perfCounters,
} from '@/lib/debug/perf-counters'
import { useDraftPersistence } from './app/use-draft-persistence'
import { createSceneCommandActions } from './app/scene-command-actions'
import { sceneCommands } from './scene/scene-commands'

interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
  cameraPosition: [number, number, number]
  floorFinishId: string
  wallFinishId: string
  selectedId: string | null
  previewedId: string | null
  selectedName: string | null
  itemCount: number
  items: {
    id: string
    catalogId: string
    name: string
    position: [number, number, number]
    rotationY: number
    pointerTarget: {
      x: number
      y: number
    } | null
  }[]
  restoreOutcome: RestoreOutcome | null
  restoreAttemptCount: number
}

declare global {
  interface Window {
    __ROOM_LAYOUT_TEST__?: {
      getState: () => BrowserSceneState
      setOverlaysHidden: (hidden: boolean) => void
      getPerfCounters: () => PerfCounterSnapshot
      resetPerfCounters: () => void
    }
  }
}

const ROTATION_STEP_RADIANS = Math.PI / 12

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

function App() {
  if (import.meta.env.DEV) {
    perfCounters.incrAppRender()
  }
  const roomViewRef = useRef<HTMLElement | null>(null)
  const selectedItemControlsRef = useRef<HTMLDivElement | null>(null)
  const roomViewFocusFrameRef = useRef<number | null>(null)
  const previewedIdRef = useRef<string | null>(null)
  const items = useItems()
  const sceneReadModel = useSceneReadModel()
  const selectedFurniture = useSelectedFurniture()
  const historyAvailability = useHistoryAvailability()
  const editorMessage = useEditorMessage()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const [isFloorFinishLoading, setIsFloorFinishLoading] = useState(false)
  const [catalogIdToAdd, setCatalogIdToAdd] = useState('')
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const selectedSource = useSelectedSource()
  const selectedToolbarGeometry = useToolbarGeometry()
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

  const activeFloorFinishId = environmentConfig?.floorFinishes.some(
    (option) => option.id === floorFinishId,
  )
    ? floorFinishId
    : (environmentConfig?.defaultFloorFinishId ?? '')

  const activeWallFinishId = environmentConfig?.wallFinishes.some(
    (option) => option.id === wallFinishId,
  )
    ? wallFinishId
    : (environmentConfig?.defaultWallFinishId ?? '')

  const selectedFloorOption = useMemo(
    () =>
      environmentConfig
        ? findFloorFinishOption(environmentConfig, activeFloorFinishId)
        : null,
    [environmentConfig, activeFloorFinishId],
  )

  const selectedWallOption = useMemo(
    () =>
      environmentConfig
        ? findWallFinishOption(environmentConfig, activeWallFinishId)
        : null,
    [environmentConfig, activeWallFinishId],
  )

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

  const commands = useMemo(
    () =>
      createSceneCommandActions({
        catalogIdToAdd: activeCatalogIdToAdd,
        editorInteractionsEnabled: startup.editorInteractionsEnabled,
        rotationStepRadians: ROTATION_STEP_RADIANS,
      }),
    [activeCatalogIdToAdd, startup.editorInteractionsEnabled],
  )

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

  const handleCanvasKeyboardPreviewChange = useCallback(
    (id: string | null) => {
      // Keep keyboard preview reads synchronous so a quick browse+select
      // sequence cannot observe a stale ref before effects flush.
      previewedIdRef.current = id
      applyCanvasKeyboardPreviewChange(id)
    },
    [applyCanvasKeyboardPreviewChange],
  )

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

  const handleOutlinerFocusHandled = useCallback(() => {
    selectionMetaActions.clearOutlinerFocusRequest()
  }, [])

  const requestOutlinerFocusByIndex = useCallback((preferredIndex: number) => {
    selectionMetaActions.requestOutlinerFocus({
      token: Date.now(),
      preferredIndex,
    })
  }, [])

  const handlers = useSceneHandlers({
    commands,
    sync: { requestOutlinerFocusByIndex, focusRoomView },
    announcements,
    dialogState,
    overlayState: {
      clearPreview: clearPreviewOnCanvasMiss,
      clearEditorMessage: sceneStateActions.clearEditorMessage,
      setEditorMessage: sceneStateActions.setEditorMessage,
      selectedSource,
      setSelectedSource: selectionMetaActions.setSelectedSource,
      sceneReadModel,
      selectedFurniture,
    },
    startup: {
      activeFloorFinishId,
      activeWallFinishId,
      catalog: startup.catalog,
      defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
      defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
      editorInteractionsEnabled: startup.editorInteractionsEnabled,
      floorFinishIds:
        environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
      handleAssetError: startup.handleAssetError,
      handleAssetsReady: startup.handleAssetsReady,
      retryAssetLoading: startup.retryAssetLoading,
      resetEditorShellState: startup.resetEditorShellState,
      restoreInitialLayout: sceneCommands.restoreInitialLayout,
      setFloorFinishId: sceneStateActions.setFloorFinishId,
      setWallFinishId: sceneStateActions.setWallFinishId,
      wallFinishIds:
        environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
    },
  })

  const { clearQueuedMovementAnnouncement } = announcements
  useEffect(() => {
    return () => {
      clearQueuedMovementAnnouncement()
    }
  }, [clearQueuedMovementAnnouncement])

  const handleCanvasBrowse = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      const snapshot = sceneCommands.getSnapshot()
      if (!snapshot || snapshot.items.length === 0) {
        return
      }

      const orderedIds = sortSpatially(snapshot.items)
      if (orderedIds.length === 0) {
        return
      }

      const currentIndex = orderedIds.indexOf(previewedIdRef.current ?? '')
      let nextIndex: number

      if (direction === 'first') {
        nextIndex = 0
      } else if (direction === 'last') {
        nextIndex = orderedIds.length - 1
      } else if (direction === 'next') {
        nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % orderedIds.length
      } else {
        nextIndex =
          currentIndex === -1
            ? orderedIds.length - 1
            : (currentIndex - 1 + orderedIds.length) % orderedIds.length
      }

      const nextId = orderedIds[nextIndex]
      handleCanvasKeyboardPreviewChange(nextId)

      const item = snapshot.items.find((sceneItem) => sceneItem.id === nextId)
      if (item) {
        announcements.announcePolite(item.name)
      }
    },
    [handleCanvasKeyboardPreviewChange, announcements],
  )

  const handleCanvasSelectPreviewed = useCallback(() => {
    const id = previewedIdRef.current
    if (!id) {
      return
    }

    handlers.handleSelectById(id, 'canvas-keyboard')
    handleCanvasKeyboardPreviewChange(null)
  }, [handlers, handleCanvasKeyboardPreviewChange])

  const {
    startupProps,
    historyProps,
    sceneProps,
    catalogProps,
    dialogsProps,
    previewProps,
    cameraProps,
  } = useOverlayProps({
    assetError: Boolean(startup.assetError),
    assetErrorKind: startup.assetErrorKind,
    assetErrorMessage: startup.assetError?.message ?? null,
    startupLoadingActive: startup.startupLoadingActive,
    startupOverlayActive: startup.startupOverlayActive,
    onRetryAssetLoading: handlers.handleRetryAssetLoading,
    historyAvailability,
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    focusRequest: dialogState.isBlockingOverlayOpen
      ? null
      : outlinerFocusRequest,
    onFocusHandled: handleOutlinerFocusHandled,
    onNavigateBackToSelectionControls: useCallback(() => {
      const firstFocusableControl = findFirstFocusableControl(
        selectedItemControlsRef.current,
      )

      if (!firstFocusableControl) {
        return false
      }

      firstFocusableControl.focus()
      return true
    }, []),
    onSelectById: handlers.handleSelectById,
    readModel: sceneReadModel,
    sceneInteractionsDisabled:
      !startup.editorInteractionsEnabled || dialogState.isBlockingOverlayOpen,
    onSetCameraPreset: handlers.handleSetCameraPreset,
    onFocusSelected: handlers.handleFocusSelected,
    catalogIdToAdd: activeCatalogIdToAdd,
    catalog: startup.catalog,
    isCatalogDrawerOpen: dialogState.isCatalogDrawerOpen,
    onAddFurniture: handlers.handleAddFurniture,
    onCatalogIdToAddChange: setCatalogIdToAdd,
    onCatalogDrawerOpenChange: handlers.handleCatalogDrawerOpenChange,
    isDeleteDialogOpen: dialogState.isDeleteDialogOpen,
    pendingDeleteFurniture: dialogState.pendingDeleteFurniture,
    onCloseDeleteDialog: dialogState.closeDialog,
    onConfirmDeleteSelection: handlers.handleConfirmDeleteSelection,
    isBlockingOverlayOpen: dialogState.isBlockingOverlayOpen,
    roomSurfaceLayout: dialogState.roomSurfaceLayout,
    isRoomSurfaceOpen: dialogState.isRoomSurfaceOpen,
    isHeaderMoreActionsOpen: dialogState.isHeaderMoreActionsOpen,
    onRoomSurfaceOpenChange: dialogState.setRoomSurfaceOpen,
    isStartOverDialogOpen: dialogState.isStartOverDialogOpen,
    onCloseStartOverDialog: dialogState.closeDialog,
    onOpenStartOverDialog: handlers.handleOpenStartOverDialog,
    onConfirmStartOver: handlers.handleConfirmStartOver,
    isInfoDialogOpen: dialogState.isInfoDialogOpen,
    onInfoDialogOpenChange: dialogState.setInfoOpen,
    isKeyboardShortcutsDialogOpen: dialogState.isKeyboardShortcutsDialogOpen,
    onKeyboardShortcutsDialogOpenChange: dialogState.setKeyboardShortcutsOpen,
    onHeaderMoreActionsOpenChange: dialogState.setHeaderMoreActionsOpen,
    returnFocusTarget: dialogState.returnFocusTarget,
    onPreviewChange: handleOutlinerPreviewChange,
    previewedId,
  })

  useEffect(() => {
    previewedIdRef.current = previewedId
  }, [previewedId])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const storeState = sceneStateStore.getState()
        const snapshotItems = sceneCommands.getSnapshot()?.items ?? []
        const pointerTargetsById = new Map(
          snapshotItems.map((item) => [item.id, item.pointerTarget] as const),
        )
        const cameraPosition = sceneCommands.getCameraPosition()
        const selectedItem = storeState.selectedId
          ? (storeState.history.present.find(
              (item) => item.id === storeState.selectedId,
            ) ?? null)
          : null

        return {
          assetsReady: editorRuntimeStore.getState().startupPhase === 'ready',
          assetError: editorRuntimeStore.getState().assetError !== null,
          cameraPosition,
          floorFinishId: activeFloorFinishId,
          wallFinishId: activeWallFinishId,
          selectedId: storeState.selectedId,
          previewedId: previewedIdRef.current,
          selectedName: selectedItem?.name ?? null,
          itemCount: storeState.history.present.length,
          items: storeState.history.present.map((item) => ({
            id: item.id,
            catalogId: item.catalogId,
            name: item.name,
            position: item.position,
            rotationY: item.rotationY,
            pointerTarget: pointerTargetsById.get(item.id) ?? null,
          })),
          restoreOutcome: editorRuntimeStore.getState().restoreOutcome,
          restoreAttemptCount:
            editorRuntimeStore.getState().restoreAttemptCount,
        }
      },
      setOverlaysHidden: (hidden: boolean) => {
        setTestOverlaysHidden(hidden)
      },
      getPerfCounters: () => perfCounters.read(),
      resetPerfCounters: () => {
        perfCounters.reset()
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [activeFloorFinishId, activeWallFinishId])

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
      <main
        className="relative size-full"
        aria-busy={startup.startupLoadingActive}
        data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
      >
        <h1 className="sr-only">Room Layout</h1>
        <p id="scene-instructions" className="sr-only">
          Interactive 3D room editor. Tab to focus the room-view region, then
          use the arrow keys to preview items in the room and Enter or Space to
          select the previewed item. You can also use the furniture in room
          panel and selected item actions and details to rotate, remove, or type
          exact placement changes without dragging. When focus is in the
          furniture in room panel, press Shift+Tab to return to selected item
          actions and details.
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
                  renderQuality={isE2ELowRenderQuality ? 'e2e-low' : 'default'}
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
                  onFloorLoadingChange={setIsFloorFinishLoading}
                />
              </Suspense>
            </SceneAssetErrorBoundary>
          </Canvas>
        </section>

        {testOverlaysHidden ? null : (
          <>
            <SelectedItemControls
              containerRef={selectedItemControlsRef}
              editorInteractionsEnabled={startup.editorInteractionsEnabled}
              exclusionRects={overlayExclusions.rects}
              isCatalogDrawerOpen={dialogState.isCatalogDrawerOpen}
              onInvalidSelectedItemDetailValue={
                handlers.handleInvalidSelectedItemDetailValue
              }
              onOpenDeleteDialog={handlers.handleOpenDeleteDialog}
              onRotateSelection={handlers.handleRotateSelection}
              onUpdateSelectedItemDetails={
                handlers.handleUpdateSelectedItemDetails
              }
              roomViewRef={roomViewRef}
              selectedDetailsRef={overlayExclusions.registerExclusionElement(
                'selected-details',
              )}
              selectedFurniture={selectedFurniture}
              selectedToolbarGeometry={selectedToolbarGeometry}
              startupOverlayActive={startup.startupOverlayActive}
            />

            <EditorOverlay
              editorInteractionsEnabled={startup.editorInteractionsEnabled}
              startOverDisabled={sceneIsAtDefaults}
              onHeaderLayoutModeChange={dialogState.syncLayoutMode}
              statusMessage={editorMessage}
              onShareSceneUrl={() => handlers.handleShareSceneUrl()}
              camera={cameraProps}
              startup={startupProps}
              history={historyProps}
              scene={sceneProps}
              catalog={catalogProps}
              dialogs={dialogsProps}
              preview={previewProps}
              floorFinishId={activeFloorFinishId}
              floorFinishLoading={isFloorFinishLoading}
              floorFinishes={environmentConfig?.floorFinishes ?? []}
              onFloorFinishChange={sceneStateActions.setFloorFinishId}
              wallFinishId={activeWallFinishId}
              wallFinishes={environmentConfig?.wallFinishes ?? []}
              onWallFinishChange={sceneStateActions.setWallFinishId}
              topHeaderElementRef={overlayExclusions.registerExclusionElement(
                'top-header',
              )}
              outlinerElementRef={overlayExclusions.registerExclusionElement(
                'outliner',
              )}
              cameraToolsElementRef={overlayExclusions.registerExclusionElement(
                'camera-tools',
              )}
              desktopRoomSidebarElementRef={overlayExclusions.registerExclusionElement(
                'desktop-room-sidebar',
              )}
              mobileRoomDrawerElementRef={overlayExclusions.registerExclusionElement(
                'mobile-room-drawer',
              )}
            />
          </>
        )}
        <Announcer
          politeMessage={announcements.politeAnnouncement}
          assertiveMessage={announcements.assertiveAnnouncement}
        />
        <Toaster />
      </main>
    </TooltipProvider>
  )
}

export default App
