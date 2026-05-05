import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import {
  Component,
  Suspense,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { SceneRef } from './scene/scene.types'
import { EditorOverlay } from './app/overlay/editor-overlay'
import { useDialogState } from './app/overlay/use-dialog-state'
import { useKeyboardShortcuts } from './app/keyboard/use-keyboard-shortcuts'
import { useOverlayState } from './app/overlay/use-overlay-state'
import { useOverlayProps } from './app/overlay/use-overlay-props'
import { useSceneCommands } from './app/hooks/use-scene-commands'
import { useAnnouncements } from './app/hooks/use-announcements'
import { useSceneSync } from './app/hooks/use-scene-sync'
import { usePreviewController } from './app/use-preview-controller'
import { useStartupLifecycle } from './app/use-startup-lifecycle'
import { useSceneHandlers } from './app/use-scene-handlers'
import { Announcer } from './app/scene-panel/announcer'
import { TooltipProvider } from './components/ui/tooltip'

interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
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
  const overlayState = useOverlayState()

  const startup = useStartupLifecycle({
    sceneRef,
    resetOverlayState: overlayState.resetOverlayState,
  })

  const announcements = useAnnouncements()

  const dialogState = useDialogState({
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
    startupOverlayActive: startup.startupOverlayActive,
    selectedFurniture: overlayState.selectedFurniture,
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
    overlayState,
    startup,
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
  } = useOverlayProps({
    assetError: Boolean(startup.assetError),
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
    isInfoDialogOpen: dialogState.isInfoDialogOpen,
    onInfoDialogOpenChange: dialogState.setInfoOpen,
    onPreviewChange: handleOutlinerPreviewChange,
  })

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const sceneState = sceneRef.current?.getSnapshot()

        return {
          assetsReady: startup.assetsReadyRef.current,
          assetError: startup.assetErrorRef.current !== null,
          selectedId: sceneState?.selectedId ?? null,
          previewedId,
          selectedName: sceneState?.selectedName ?? null,
          itemCount: sceneState?.itemCount ?? 0,
          items: sceneState?.items ?? [],
        }
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [previewedId, startup.assetErrorRef, startup.assetsReadyRef])

  useKeyboardShortcuts({
    enabled: startup.editorInteractionsEnabled,
    canUndo: overlayState.historyAvailability.canUndo,
    canRedo: overlayState.historyAvailability.canRedo,
    hasSelection: overlayState.selectedFurniture !== null,
    isModalOpen: dialogState.isModalOpen,
    onUndo: handlers.handleUndo,
    onRedo: handlers.handleRedo,
    onOpenDeleteDialog: handlers.handleOpenDeleteDialog,
    onMoveSelection: (delta) => {
      handlers.handleMoveSelection(delta, { source: 'keyboard' })
    },
    onClearSelection: handlers.handleClearSelection,
    onRotate: handlers.handleRotateSelection,
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
            onPointerMissed={() => {
              if (!startup.editorInteractionsEnabled) {
                return
              }

              clearPreviewOnCanvasMiss()
              handlers.handleClearSelection()
            }}
            shadows
          >
            <color attach="background" args={['#f0f0f0']} />
            <SceneAssetErrorBoundary
              key={startup.cacheInvalidationKey}
              onError={handlers.handleSceneAssetError}
            >
              <Suspense fallback={null}>
                <Scene
                  ref={sceneRef}
                  catalog={startup.catalog}
                  collections={startup.collections}
                  onSelectionChange={handlers.handleSceneSelectionChange}
                  onHistoryChange={handlers.handleSceneHistoryChange}
                  onAssetsReady={handlers.handleSceneAssetsReady}
                  previewedId={previewedId}
                  onPreviewChange={handleScenePreviewChange}
                  onDragStateChange={handleDragStateChange}
                />
              </Suspense>
            </SceneAssetErrorBoundary>
          </Canvas>
        </section>

        <EditorOverlay
          editorInteractionsEnabled={startup.editorInteractionsEnabled}
          statusMessage={overlayState.editorMessage}
          startup={startupProps}
          history={historyProps}
          scene={sceneProps}
          selection={selectionProps}
          catalog={catalogProps}
          dialogs={dialogsProps}
          preview={previewProps}
        />
        <Announcer
          politeMessage={announcements.politeAnnouncement}
          assertiveMessage={announcements.assertiveAnnouncement}
        />
      </main>
    </TooltipProvider>
  )
}

export default App
