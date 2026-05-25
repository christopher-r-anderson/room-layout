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
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import type { SceneRef } from './scene/scene.types'
import {
  findFloorFinishOption,
  findWallFinishOption,
} from './lib/three/environment-materials'
import { EditorOverlay } from './app/overlay/editor-overlay'
import { useDialogState } from './app/overlay/use-dialog-state'
import { useKeyboardShortcuts } from './app/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from './app/keyboard/use-camera-key-state'
import { useOverlayState } from './app/overlay/use-overlay-state'
import { useOverlayProps } from './app/overlay/use-overlay-props'
import { useSceneCommands } from './app/hooks/use-scene-commands'
import { useAnnouncements } from './app/hooks/use-announcements'
import { useSceneSync } from './app/hooks/use-scene-sync'
import { usePreviewController } from './app/use-preview-controller'
import { useStartupLifecycle } from './app/use-startup-lifecycle'
import { useSceneHandlers, type RestoreOutcome } from './app/use-scene-handlers'
import { Announcer } from './app/scene-panel/announcer'
import { TooltipProvider } from './components/ui/tooltip'
import { Toaster } from './components/ui/sonner'
import { clearSceneDraft, saveSceneDraft } from './app/url-scene/scene-draft'
import { isFreshSceneState } from './app/startup/scene-defaults'
import { sortSpatially } from './lib/three/spatial-sort'
import { SelectedItemControls } from './app/selection/selected-item-controls'

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
  const sceneRef = useRef<SceneRef | null>(null)
  const roomViewRef = useRef<HTMLElement | null>(null)
  const roomViewFocusFrameRef = useRef<number | null>(null)
  const previewedIdRef = useRef<string | null>(null)
  const overlayState = useOverlayState()
  const [floorFinishId, setFloorFinishId] = useState('')
  const [wallFinishId, setWallFinishId] = useState('')
  const [isFloorFinishLoading, setIsFloorFinishLoading] = useState(false)
  const [isSceneDragging, setIsSceneDragging] = useState(false)
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const isE2ELowRenderQuality =
    import.meta.env.DEV && import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'

  const startup = useStartupLifecycle({
    sceneRef,
    resetOverlayState: overlayState.resetOverlayState,
  })

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

  const sceneIsAtDefaults = useMemo(() => {
    if (!environmentConfig) {
      return false
    }

    return isFreshSceneState(
      {
        items: overlayState.sceneReadModel.items,
        floorFinishId: activeFloorFinishId,
        wallFinishId: activeWallFinishId,
      },
      environmentConfig,
    )
  }, [
    overlayState.sceneReadModel.items,
    environmentConfig,
    activeFloorFinishId,
    activeWallFinishId,
  ])

  const announcements = useAnnouncements()

  const dialogState = useDialogState({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    startupOverlayActive: startup.startupOverlayActive,
    selectedFurniture: overlayState.selectedFurniture,
    canStartNewScene: !sceneIsAtDefaults,
  })

  const commands = useSceneCommands({
    catalogIdToAdd: overlayState.catalogIdToAdd,
    clearEditorMessage: overlayState.clearEditorMessage,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    rotationStepRadians: ROTATION_STEP_RADIANS,
    sceneRef,
    setEditorMessage: overlayState.setEditorMessage,
  })

  const itemIds = useMemo(
    () => overlayState.sceneReadModel.items.map((item) => item.id),
    [overlayState.sceneReadModel.items],
  )

  const {
    previewedId,
    handleScenePreviewChange,
    handleOutlinerPreviewChange,
    handleCanvasKeyboardPreviewChange,
    handleDragStateChange,
    clearPreviewOnCanvasMiss,
  } = usePreviewController({
    isModalOpen: dialogState.isModalOpen,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    itemIds,
  })

  const handleSceneDragStateChange = (dragging: boolean) => {
    setIsSceneDragging(dragging)
    handleDragStateChange(dragging)
  }

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

  const sync = useSceneSync({
    sceneRef,
    isModalOpen: dialogState.isModalOpen,
    handleSceneReadModelChange: overlayState.handleSceneReadModelChange,
    announcePolite: announcements.announcePolite,
  })

  const handlers = useSceneHandlers({
    commands,
    sync: { ...sync, focusRoomView },
    announcements,
    dialogState,
    overlayState: {
      clearPreview: clearPreviewOnCanvasMiss,
      clearEditorMessage: overlayState.clearEditorMessage,
      setEditorMessage: overlayState.setEditorMessage,
      selectedSource: overlayState.selectedSource,
      setSelectedSource: overlayState.setSelectedSource,
      sceneReadModel: overlayState.sceneReadModel,
      selectedFurniture: overlayState.selectedFurniture,
      handleHistoryChange: overlayState.handleHistoryChange,
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
      restoreInitialLayout: (instances) => {
        if (!sceneRef.current)
          throw new Error('sceneRef not initialized at restore')
        sceneRef.current.restoreInitialLayout(instances)
      },
      setFloorFinishId,
      setWallFinishId,
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
      const snapshot = sceneRef.current?.getSnapshot()
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

      const item = snapshot.items.find((i) => i.id === nextId)
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

  const { initializeCatalogSelection } = overlayState
  useEffect(() => {
    initializeCatalogSelection(startup.catalog)
  }, [startup.catalog, initializeCatalogSelection])

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
    historyAvailability: overlayState.historyAvailability,
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    focusRequest: sync.outlinerFocusRequest,
    onFocusHandled: sync.handleOutlinerFocusHandled,
    onSelectById: handlers.handleSelectById,
    readModel: overlayState.sceneReadModel,
    sceneInteractionsDisabled:
      !startup.editorInteractionsEnabled || dialogState.isModalOpen,
    onSetCameraPreset: handlers.handleSetCameraPreset,
    onFocusSelected: handlers.handleFocusSelected,
    catalogIdToAdd: overlayState.catalogIdToAdd,
    catalog: startup.catalog,
    isCatalogDrawerOpen: dialogState.isCatalogDrawerOpen,
    onAddFurniture: handlers.handleAddFurniture,
    onCatalogIdToAddChange: overlayState.setCatalogIdToAdd,
    onCatalogDrawerOpenChange: handlers.handleCatalogDrawerOpenChange,
    isDeleteDialogOpen: dialogState.isDeleteDialogOpen,
    pendingDeleteFurniture: dialogState.pendingDeleteFurniture,
    onCloseDeleteDialog: dialogState.closeDialog,
    onConfirmDeleteSelection: handlers.handleConfirmDeleteSelection,
    isNewSceneDialogOpen: dialogState.isNewSceneDialogOpen,
    onCloseNewSceneDialog: dialogState.closeDialog,
    onOpenNewSceneDialog: handlers.handleOpenNewSceneDialog,
    onConfirmNewScene: handlers.handleConfirmNewScene,
    isInfoDialogOpen: dialogState.isInfoDialogOpen,
    onInfoDialogOpenChange: dialogState.setInfoOpen,
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
        const sceneState = sceneRef.current?.getSnapshot()
        const rawCameraPosition = sceneState?.cameraPosition
        const cameraPosition: [number, number, number] = rawCameraPosition
          ? [rawCameraPosition[0], rawCameraPosition[1], rawCameraPosition[2]]
          : [0, 0, 0]

        return {
          assetsReady: startup.assetsReadyRef.current,
          assetError: startup.assetErrorRef.current !== null,
          cameraPosition,
          floorFinishId: activeFloorFinishId,
          wallFinishId: activeWallFinishId,
          selectedId: sceneState?.selectedId ?? null,
          previewedId: previewedIdRef.current,
          selectedName: sceneState?.selectedName ?? null,
          itemCount: sceneState?.itemCount ?? 0,
          items: sceneState?.items ?? [],
          restoreOutcome: handlers.restoreOutcomeRef.current,
          restoreAttemptCount: handlers.restoreAttemptCountRef.current,
        }
      },
      setOverlaysHidden: (hidden: boolean) => {
        setTestOverlaysHidden(hidden)
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [
    activeFloorFinishId,
    activeWallFinishId,
    startup.assetErrorRef,
    startup.assetsReadyRef,
    handlers.restoreOutcomeRef,
    handlers.restoreAttemptCountRef,
  ])

  useEffect(() => {
    if (startup.startupLoadingActive || isSceneDragging) {
      return
    }

    if (!environmentConfig) {
      return
    }

    if (sceneIsAtDefaults) {
      clearSceneDraft()
      return
    }

    saveSceneDraft(overlayState.sceneReadModel.items, {
      floorFinishId: environmentConfig.floorFinishes.some(
        (option) => option.id === activeFloorFinishId,
      )
        ? activeFloorFinishId
        : undefined,
      wallFinishId: environmentConfig.wallFinishes.some(
        (option) => option.id === activeWallFinishId,
      )
        ? activeWallFinishId
        : undefined,
    })
  }, [
    startup.startupLoadingActive,
    isSceneDragging,
    overlayState.sceneReadModel.items,
    environmentConfig,
    sceneIsAtDefaults,
    activeFloorFinishId,
    activeWallFinishId,
  ])

  useKeyboardShortcuts({
    enabled: startup.editorInteractionsEnabled,
    hasSelection: overlayState.selectedFurniture !== null,
    isModalOpen: dialogState.isModalOpen,
    canStartNewScene: !sceneIsAtDefaults,
    roomViewHasFocus,
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    onNewSceneIntent: handlers.handleOpenNewSceneDialog,
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
    isModalOpen: dialogState.isModalOpen,
    roomViewHasFocus,
    sceneRef,
  })

  return (
    <TooltipProvider>
      <main
        className="relative size-full"
        aria-busy={startup.startupLoadingActive}
        data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
      >
        <p id="scene-instructions" className="sr-only">
          Interactive 3D room editor. Tab to focus the room-view region, then
          use the arrow keys to preview items in the room and Enter or Space to
          select the previewed item. You can also use the furniture in room
          panel and selected item actions and details to rotate, remove, or type
          exact placement changes without dragging.
        </p>
        <section
          aria-describedby="scene-instructions"
          aria-label="Interactive 3D room editor"
          ref={roomViewRef}
          tabIndex={startup.editorInteractionsEnabled ? 0 : -1}
          className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onFocus={() => {
            setRoomViewHasFocus(true)
          }}
          onBlur={() => {
            setRoomViewHasFocus(false)
          }}
          onPointerDownCapture={focusRoomView}
        >
          <Canvas
            className="absolute inset-0 z-0"
            camera={{
              position: [3, 2.5, 3],
              fov: 50,
            }}
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
            shadows={!isE2ELowRenderQuality}
          >
            <SceneAssetErrorBoundary
              key={startup.cacheInvalidationKey}
              onError={handlers.handleSceneAssetError}
            >
              <Suspense fallback={null}>
                <Scene
                  ref={sceneRef}
                  renderQuality={isE2ELowRenderQuality ? 'e2e-low' : 'default'}
                  catalog={startup.catalog}
                  collections={startup.collections}
                  onCanvasPointerSelection={
                    handlers.handleCanvasPointerSelection
                  }
                  onSelectionChange={handlers.handleSceneSelectionChange}
                  onHistoryChange={handlers.handleSceneHistoryChange}
                  onAssetsReady={handlers.handleSceneAssetsReady}
                  previewedId={previewedId}
                  onPreviewChange={handleScenePreviewChange}
                  onDragStateChange={handleSceneDragStateChange}
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
              editorInteractionsEnabled={startup.editorInteractionsEnabled}
              isCatalogDrawerOpen={dialogState.isCatalogDrawerOpen}
              onOpenDeleteDialog={handlers.handleOpenDeleteDialog}
              onRotateSelection={handlers.handleRotateSelection}
              onUpdateSelectedItemDetails={
                handlers.handleUpdateSelectedItemDetails
              }
              selectedFurniture={overlayState.selectedFurniture}
              startupOverlayActive={startup.startupOverlayActive}
            />

            <EditorOverlay
              editorInteractionsEnabled={startup.editorInteractionsEnabled}
              newSceneDisabled={sceneIsAtDefaults}
              statusMessage={overlayState.editorMessage}
              onCopySceneUrl={handlers.handleCopySceneUrl}
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
              onFloorFinishChange={setFloorFinishId}
              wallFinishId={activeWallFinishId}
              wallFinishes={environmentConfig?.wallFinishes ?? []}
              onWallFinishChange={setWallFinishId}
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
