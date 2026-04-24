import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import { Component, Suspense, type ReactNode, useEffect, useRef } from 'react'
import type { SceneRef } from './scene/scene.types'
import { EditorOverlay } from './app/editor-overlay'
import { useEditorKeyboardShortcuts } from './app/use-editor-keyboard-shortcuts'
import { useEditorOverlayState } from './app/use-editor-overlay-state'
import { useSceneStartupState } from './app/use-scene-startup-state'
import { TooltipProvider } from './components/ui/tooltip'

interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
  selectedId: string | null
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
  const editorInteractionsEnabledRef = useRef(false)
  const startupOverlayActiveRef = useRef(false)
  const editorOverlayState = useEditorOverlayState({
    editorInteractionsEnabledRef,
    rotationStepRadians: ROTATION_STEP_RADIANS,
    sceneRef,
    startupOverlayActiveRef,
  })
  const {
    addFurniture,
    catalogIdToAdd,
    isCatalogDrawerOpen,
    closeDeleteDialog,
    closeOpenDialogs,
    confirmDeleteSelection,
    editorMessage,
    getIsModalOpen,
    handleHistoryChange,
    handleSelectionChange,
    historyAvailability,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    openDeleteDialog,
    pendingDeleteFurniture,
    redo,
    resetEditorShellState,
    rotateSelection,
    selectedFurniture,
    setCatalogDrawerOpen,
    setInfoDialogOpen,
    setCatalogIdToAdd,
    undo,
  } = editorOverlayState

  const {
    assetError,
    assetErrorRef,
    assetsReadyRef,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    sceneVersion,
    startupLoadingActive,
    startupOverlayActive,
  } = useSceneStartupState({
    closeOpenDialogs,
    resetEditorShellState,
  })

  useEffect(() => {
    editorInteractionsEnabledRef.current = editorInteractionsEnabled
  }, [editorInteractionsEnabled])

  useEffect(() => {
    startupOverlayActiveRef.current = startupOverlayActive
  }, [startupOverlayActive])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const sceneState = sceneRef.current?.getSnapshot()

        return {
          assetsReady: assetsReadyRef.current,
          assetError: assetErrorRef.current !== null,
          selectedId: sceneState?.selectedId ?? null,
          selectedName: sceneState?.selectedName ?? null,
          itemCount: sceneState?.itemCount ?? 0,
          items: sceneState?.items ?? [],
        }
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [assetErrorRef, assetsReadyRef])

  useEditorKeyboardShortcuts({
    enabled: editorInteractionsEnabled,
    canUndo: historyAvailability.canUndo,
    canRedo: historyAvailability.canRedo,
    hasSelection: selectedFurniture !== null,
    getIsModalOpen,
    onUndo: undo,
    onRedo: redo,
    onOpenDeleteDialog: openDeleteDialog,
    onRotate: rotateSelection,
  })

  return (
    <TooltipProvider>
      <div className="relative size-full" aria-busy={startupLoadingActive}>
        <Canvas
          className="absolute inset-0 z-0"
          camera={{
            position: [3, 2.5, 3],
            fov: 50,
          }}
          onPointerMissed={() => {
            if (!editorInteractionsEnabled) {
              return
            }

            sceneRef.current?.clearSelection()
          }}
          shadows
        >
          <color attach="background" args={['#f0f0f0']} />
          <SceneAssetErrorBoundary
            key={sceneVersion}
            onError={handleAssetError}
          >
            <Suspense fallback={null}>
              <Scene
                ref={sceneRef}
                onSelectionChange={handleSelectionChange}
                onHistoryChange={handleHistoryChange}
                onAssetsReady={handleAssetsReady}
              />
            </Suspense>
          </SceneAssetErrorBoundary>
        </Canvas>

        <EditorOverlay
          assetError={Boolean(assetError)}
          catalogIdToAdd={catalogIdToAdd}
          editorInteractionsEnabled={editorInteractionsEnabled}
          editorMessage={editorMessage}
          historyAvailability={historyAvailability}
          isCatalogDrawerOpen={isCatalogDrawerOpen}
          isDeleteDialogOpen={isDeleteDialogOpen}
          isInfoDialogOpen={isInfoDialogOpen}
          onAddFurniture={addFurniture}
          onCatalogIdToAddChange={setCatalogIdToAdd}
          onCatalogDrawerOpenChange={setCatalogDrawerOpen}
          onCloseDeleteDialog={closeDeleteDialog}
          onConfirmDeleteSelection={confirmDeleteSelection}
          onInfoDialogOpenChange={setInfoDialogOpen}
          onOpenDeleteDialog={openDeleteDialog}
          onRedo={redo}
          onRetryAssetLoading={retryAssetLoading}
          onRotateSelection={rotateSelection}
          onUndo={undo}
          pendingDeleteFurniture={pendingDeleteFurniture}
          selectedFurniture={selectedFurniture}
          startupLoadingActive={startupLoadingActive}
          startupOverlayActive={startupOverlayActive}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
