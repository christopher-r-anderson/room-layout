import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import {
  Component,
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useRef,
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
  const previewedIdRef = useRef<string | null>(null)
  const overlayState = useOverlayState()
  const [floorFinishId, setFloorFinishId] = useState('')
  const [wallFinishId, setWallFinishId] = useState('')
  const [isFloorFinishLoading, setIsFloorFinishLoading] = useState(false)
  const [isSceneDragging, setIsSceneDragging] = useState(false)
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

  const sync = useSceneSync({
    sceneRef,
    isModalOpen: dialogState.isModalOpen,
    handleSceneReadModelChange: overlayState.handleSceneReadModelChange,
    announcePolite: announcements.announcePolite,
  })

  const handlers = useSceneHandlers({
    commands,
    sync,
    announcements,
    dialogState,
    overlayState: {
      clearPreview: clearPreviewOnCanvasMiss,
      clearEditorMessage: overlayState.clearEditorMessage,
      setEditorMessage: overlayState.setEditorMessage,
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

  const { initializeCatalogSelection } = overlayState
  useEffect(() => {
    initializeCatalogSelection(startup.catalog)
  }, [startup.catalog, initializeCatalogSelection])

  const {
    startupProps,
    historyProps,
    sceneProps,
    selectionProps,
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
    selectedFurniture: overlayState.selectedFurniture,
    onMoveSelection: handlers.handleMoveSelection,
    onOpenDeleteDialog: handlers.handleOpenDeleteDialog,
    onRotateSelection: handlers.handleRotateSelection,
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
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    onNewSceneIntent: handlers.handleOpenNewSceneDialog,
    onOpenDeleteDialog: handlers.handleOpenDeleteDialog,
    onFocusSelected: handlers.handleFocusSelected,
    onMoveSelection: (delta) => {
      handlers.handleMoveSelection(delta, { source: 'keyboard' })
    },
    onClearSelection: handlers.handleClearSelection,
    onRotate: handlers.handleRotateSelection,
    onSetCameraPreset: handlers.handleSetCameraPreset,
  })

  useCameraKeyState({
    enabled: startup.editorInteractionsEnabled,
    isModalOpen: dialogState.isModalOpen,
    sceneRef,
  })

  return (
    <TooltipProvider>
      <main
        className="relative size-full"
        aria-busy={startup.startupLoadingActive}
      >
        <p id="scene-instructions" className="sr-only">
          Interactive 3D room editor. Use the furniture list to select items and
          the selected item panel to move, rotate, or delete them without
          dragging.
        </p>
        <section
          aria-describedby="scene-instructions"
          aria-label="Interactive 3D room editor"
          className="absolute inset-0 z-0"
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

        <EditorOverlay
          editorInteractionsEnabled={startup.editorInteractionsEnabled}
          newSceneDisabled={sceneIsAtDefaults}
          statusMessage={overlayState.editorMessage}
          onCopySceneUrl={handlers.handleCopySceneUrl}
          camera={cameraProps}
          startup={startupProps}
          history={historyProps}
          scene={sceneProps}
          selection={selectionProps}
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
