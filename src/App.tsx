import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene } from './scene/scene'
import {
  Component,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { SceneRef } from './scene/scene.types'
import { FURNITURE_CATALOG } from './scene/objects/furniture-catalog'
import type { FurnitureItem } from './scene/objects/furniture.types'
import { EditorOverlay } from './app/editor-overlay'
import { useEditorKeyboardShortcuts } from './app/use-editor-keyboard-shortcuts'
import { useSceneStartupState } from './app/use-scene-startup-state'

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
  const infoDialogRef = useRef<HTMLDialogElement | null>(null)
  const confirmDeleteDialogRef = useRef<HTMLDialogElement | null>(null)
  const infoButtonRef = useRef<HTMLButtonElement | null>(null)
  const removeButtonRef = useRef<HTMLButtonElement | null>(null)
  const [selectedFurniture, setSelectedFurniture] =
    useState<FurnitureItem | null>(null)
  const [catalogIdToAdd, setCatalogIdToAdd] = useState(
    FURNITURE_CATALOG[0]?.id ?? '',
  )
  const [pendingDeleteFurniture, setPendingDeleteFurniture] =
    useState<FurnitureItem | null>(null)
  const [editorMessage, setEditorMessage] = useState<string | null>(null)
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  })

  const resetEditorShellState = useCallback(() => {
    sceneRef.current = null
    setSelectedFurniture(null)
    setPendingDeleteFurniture(null)
    setEditorMessage(null)
    setHistoryAvailability({
      canUndo: false,
      canRedo: false,
    })
  }, [])

  const closeOpenDialogs = useCallback(() => {
    confirmDeleteDialogRef.current?.close()
    infoDialogRef.current?.close()
  }, [])

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

  const closeDeleteDialog = useCallback(() => {
    confirmDeleteDialogRef.current?.close()
    setPendingDeleteFurniture(null)
    removeButtonRef.current?.focus()
  }, [])

  const openDeleteDialog = useCallback(() => {
    if (
      !editorInteractionsEnabled ||
      !selectedFurniture ||
      confirmDeleteDialogRef.current?.open
    ) {
      return
    }

    setPendingDeleteFurniture(selectedFurniture)
    setEditorMessage(null)
    confirmDeleteDialogRef.current?.showModal()
  }, [editorInteractionsEnabled, selectedFurniture])

  const rotateSelection = useCallback(
    (direction: -1 | 1) => {
      if (!editorInteractionsEnabled) {
        return
      }

      sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
    },
    [editorInteractionsEnabled],
  )

  const undo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.undo()
  }, [editorInteractionsEnabled])

  const redo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.redo()
  }, [editorInteractionsEnabled])

  useEditorKeyboardShortcuts({
    enabled: editorInteractionsEnabled,
    canUndo: historyAvailability.canUndo,
    canRedo: historyAvailability.canRedo,
    hasSelection: selectedFurniture !== null,
    getIsModalOpen: () => {
      return (
        Boolean(infoDialogRef.current?.open) ||
        Boolean(confirmDeleteDialogRef.current?.open)
      )
    },
    onUndo: undo,
    onRedo: redo,
    onOpenDeleteDialog: openDeleteDialog,
    onRotate: rotateSelection,
  })

  const addFurniture = () => {
    if (!editorInteractionsEnabled || !catalogIdToAdd) {
      return
    }

    const result = sceneRef.current?.addFurniture(catalogIdToAdd)

    if (!result) {
      return
    }

    if (!result.ok) {
      setEditorMessage(
        result.reason === 'no-space'
          ? 'No safe placement slot is available for that furniture item.'
          : 'The selected furniture entry is no longer available.',
      )
      return
    }

    setEditorMessage(null)
  }

  const openInfoDialog = () => {
    if (startupOverlayActive) {
      return
    }

    infoDialogRef.current?.showModal()
  }

  const closeInfoDialog = () => {
    infoDialogRef.current?.close()
    infoButtonRef.current?.focus()
  }

  const handleInfoDialogCancel = (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    event.preventDefault()
    closeInfoDialog()
  }

  const handleInfoDialogClick = (
    event: React.MouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === event.currentTarget) {
      closeInfoDialog()
    }
  }

  const handleDeleteDialogCancel = (
    event: React.SyntheticEvent<HTMLDialogElement>,
  ) => {
    event.preventDefault()
    closeDeleteDialog()
  }

  const handleDeleteDialogClick = (
    event: React.MouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === event.currentTarget) {
      closeDeleteDialog()
    }
  }

  const confirmRemoveSelection = () => {
    if (!editorInteractionsEnabled) {
      return
    }

    const removed = sceneRef.current?.removeSelection() ?? false

    closeDeleteDialog()

    if (!removed) {
      setEditorMessage('No selected furniture item was available to remove.')
      return
    }

    setEditorMessage(null)
  }

  return (
    <div className="app" aria-busy={startupLoadingActive}>
      <Canvas
        className="canvas"
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
        <SceneAssetErrorBoundary key={sceneVersion} onError={handleAssetError}>
          <Suspense fallback={null}>
            <Scene
              ref={sceneRef}
              onSelectionChange={setSelectedFurniture}
              onHistoryChange={setHistoryAvailability}
              onAssetsReady={handleAssetsReady}
            />
          </Suspense>
        </SceneAssetErrorBoundary>
      </Canvas>

      <EditorOverlay
        assetError={Boolean(assetError)}
        catalogIdToAdd={catalogIdToAdd}
        confirmDeleteDialogRef={confirmDeleteDialogRef}
        editorInteractionsEnabled={editorInteractionsEnabled}
        editorMessage={editorMessage}
        handleDeleteDialogCancel={handleDeleteDialogCancel}
        handleDeleteDialogClick={handleDeleteDialogClick}
        handleInfoDialogCancel={handleInfoDialogCancel}
        handleInfoDialogClick={handleInfoDialogClick}
        historyAvailability={historyAvailability}
        infoButtonRef={infoButtonRef}
        infoDialogRef={infoDialogRef}
        onAddFurniture={addFurniture}
        onCatalogIdToAddChange={setCatalogIdToAdd}
        onCloseDeleteDialog={closeDeleteDialog}
        onCloseInfoDialog={closeInfoDialog}
        onConfirmRemoveSelection={confirmRemoveSelection}
        onOpenDeleteDialog={openDeleteDialog}
        onOpenInfoDialog={openInfoDialog}
        onRedo={redo}
        onRetryAssetLoading={retryAssetLoading}
        onRotateSelection={rotateSelection}
        onUndo={undo}
        pendingDeleteFurniture={pendingDeleteFurniture}
        removeButtonRef={removeButtonRef}
        selectedFurniture={selectedFurniture}
        startupLoadingActive={startupLoadingActive}
        startupOverlayActive={startupOverlayActive}
      />
    </div>
  )
}

export default App
