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
} from 'react'
import type { SceneRef } from './scene/scene.types'
import type {
  EditorCatalogProps,
  EditorDialogsProps,
  EditorHistoryProps,
  EditorSelectionProps,
  EditorStartupProps,
} from './app/editor-overlay'
import { EditorOverlay } from './app/editor-overlay'
import { runEditorShellReset } from './app/editor-shell-reset'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './app/startup-transition-sequencing'
import { useEditorDialogState } from './app/use-editor-dialog-state'
import { useEditorKeyboardShortcuts } from './app/use-editor-keyboard-shortcuts'
import { useEditorOverlayState } from './app/use-editor-overlay-state'
import { useEditorSceneCommands } from './app/use-editor-scene-commands'
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
  } = useSceneStartupState()
  const editorOverlayState = useEditorOverlayState()
  const {
    catalogIdToAdd,
    clearEditorMessage,
    editorMessage,
    handleHistoryChange,
    handleSelectionChange,
    handleSceneItemsChange,
    historyAvailability,
    outlinerItems,
    resetOverlayState,
    selectedFurniture,
    setCatalogIdToAdd,
    setEditorMessage,
  } = editorOverlayState
  const {
    addFurniture,
    confirmDeleteSelection,
    redo,
    rotateSelection,
    selectById,
    undo,
  } = useEditorSceneCommands({
    catalogIdToAdd,
    clearEditorMessage,
    editorInteractionsEnabled,
    rotationStepRadians: ROTATION_STEP_RADIANS,
    sceneRef,
    setEditorMessage,
  })
  const dialogState = useEditorDialogState({
    editorInteractionsEnabled,
    startupOverlayActive,
    selectedFurniture,
  })
  const {
    closeAllDialogs,
    closeDialog,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    isModalOpen,
    openDelete,
    pendingDeleteFurniture,
    setCatalogOpen,
    setInfoOpen,
  } = dialogState

  const resetEditorShellState = useCallback(() => {
    runEditorShellReset({
      resetOverlayState,
      sceneRef,
    })
  }, [resetOverlayState])

  const handleCatalogDrawerOpenChange = useCallback(
    (open: boolean) => {
      const changed = setCatalogOpen(open)

      if (open && changed) {
        clearEditorMessage()
      }
    },
    [clearEditorMessage, setCatalogOpen],
  )

  const handleOpenDeleteDialog = useCallback(() => {
    const opened = openDelete()

    if (opened) {
      clearEditorMessage()
    }
  }, [clearEditorMessage, openDelete])

  const handleConfirmDeleteSelection = useCallback(() => {
    closeDialog()
    confirmDeleteSelection()
  }, [closeDialog, confirmDeleteSelection])

  const handleSceneAssetError = useCallback(
    (error: Error) => {
      runStartupAssetErrorTransition(error, {
        closeAllDialogs,
        recordAssetError: handleAssetError,
        resetEditorShellState,
      })
    },
    [closeAllDialogs, handleAssetError, resetEditorShellState],
  )

  const handleRetryAssetLoading = useCallback(() => {
    runStartupRetryTransition({
      closeAllDialogs,
      resetEditorShellState,
      retryAssetLoading,
    })
  }, [closeAllDialogs, resetEditorShellState, retryAssetLoading])

  const startupProps = useMemo<EditorStartupProps>(
    () => ({
      assetError: Boolean(assetError),
      startupLoadingActive,
      startupOverlayActive,
      onRetryAssetLoading: handleRetryAssetLoading,
    }),
    [
      assetError,
      startupLoadingActive,
      startupOverlayActive,
      handleRetryAssetLoading,
    ],
  )

  const historyProps = useMemo<EditorHistoryProps>(
    () => ({ historyAvailability, onUndo: undo, onRedo: redo }),
    [historyAvailability, undo, redo],
  )

  const selectionProps = useMemo<EditorSelectionProps>(
    () => ({
      selectedFurniture,
      outlinerItems,
      onOpenDeleteDialog: handleOpenDeleteDialog,
      onRotateSelection: rotateSelection,
      onSelectFurniture: selectById,
    }),
    [
      selectedFurniture,
      outlinerItems,
      handleOpenDeleteDialog,
      rotateSelection,
      selectById,
    ],
  )

  const catalogProps = useMemo<EditorCatalogProps>(
    () => ({
      catalogIdToAdd,
      isCatalogDrawerOpen,
      onAddFurniture: addFurniture,
      onCatalogIdToAddChange: setCatalogIdToAdd,
      onCatalogDrawerOpenChange: handleCatalogDrawerOpenChange,
    }),
    [
      catalogIdToAdd,
      isCatalogDrawerOpen,
      addFurniture,
      setCatalogIdToAdd,
      handleCatalogDrawerOpenChange,
    ],
  )

  const dialogsProps = useMemo<EditorDialogsProps>(
    () => ({
      isDeleteDialogOpen,
      pendingDeleteFurniture,
      onCloseDeleteDialog: closeDialog,
      onConfirmDeleteSelection: handleConfirmDeleteSelection,
      isInfoDialogOpen,
      onInfoDialogOpenChange: setInfoOpen,
    }),
    [
      isDeleteDialogOpen,
      pendingDeleteFurniture,
      closeDialog,
      handleConfirmDeleteSelection,
      isInfoDialogOpen,
      setInfoOpen,
    ],
  )

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
    isModalOpen,
    onUndo: undo,
    onRedo: redo,
    onOpenDeleteDialog: handleOpenDeleteDialog,
    onRotate: rotateSelection,
  })

  return (
    <TooltipProvider>
      <div
        className="relative size-full"
        aria-busy={startupLoadingActive}
        aria-label="3D room canvas"
        aria-describedby="editor-accessibility-help"
      >
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
            onError={handleSceneAssetError}
          >
            <Suspense fallback={null}>
              <Scene
                ref={sceneRef}
                onSelectionChange={handleSelectionChange}
                onHistoryChange={handleHistoryChange}
                onAssetsReady={handleAssetsReady}
                onFurnitureChange={handleSceneItemsChange}
              />
            </Suspense>
          </SceneAssetErrorBoundary>
        </Canvas>

        <EditorOverlay
          editorInteractionsEnabled={editorInteractionsEnabled}
          statusMessage={editorMessage}
          startup={startupProps}
          history={historyProps}
          selection={selectionProps}
          catalog={catalogProps}
          dialogs={dialogsProps}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
