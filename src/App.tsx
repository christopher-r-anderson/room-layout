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
import {
  DeleteConfirmationDialog,
  ProjectInfoDialog,
} from './app/editor-dialogs'
import {
  StartupErrorOverlay,
  StartupLoadingOverlay,
} from './app/startup-overlays'
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

      <div className="ui-overlay">
        <div
          className="ui-shell"
          inert={startupOverlayActive}
          aria-hidden={startupOverlayActive}
        >
          <section className="catalog-controls" aria-label="Furniture controls">
            <div className="control-group control-group-history">
              <h2 className="control-heading">History</h2>
              <div
                className="history-controls"
                role="toolbar"
                aria-label="History controls"
              >
                <button
                  type="button"
                  className="history-button"
                  disabled={
                    !editorInteractionsEnabled || !historyAvailability.canUndo
                  }
                  onClick={undo}
                  aria-keyshortcuts="Control+Z Meta+Z"
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="history-button"
                  disabled={
                    !editorInteractionsEnabled || !historyAvailability.canRedo
                  }
                  onClick={redo}
                  aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
                >
                  Redo
                </button>
              </div>
            </div>

            <div
              className="control-group"
              aria-labelledby="add-furniture-heading"
            >
              <h2 id="add-furniture-heading" className="control-heading">
                Add Furniture
              </h2>
              <label className="sr-only" htmlFor="add-furniture-select">
                Furniture type to add
              </label>
              <div className="catalog-row">
                <select
                  id="add-furniture-select"
                  className="catalog-select"
                  disabled={!editorInteractionsEnabled}
                  value={catalogIdToAdd}
                  onChange={(event) => {
                    setCatalogIdToAdd(event.target.value)
                  }}
                >
                  {FURNITURE_CATALOG.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-button"
                  disabled={!editorInteractionsEnabled || !catalogIdToAdd}
                  onClick={addFurniture}
                >
                  Add Item
                </button>
              </div>
            </div>

            <div
              className="control-group"
              aria-labelledby="selection-actions-heading"
            >
              <h2 id="selection-actions-heading" className="control-heading">
                Selection Actions
              </h2>
              <p className="selection-summary" aria-live="polite">
                {selectedFurniture ? (
                  <>Selected: {selectedFurniture.name}</>
                ) : (
                  'Selected: none'
                )}
              </p>
              <div
                className="rotation-controls"
                role="toolbar"
                aria-label="Rotation controls"
              >
                <button
                  type="button"
                  className="rotation-button"
                  disabled={!editorInteractionsEnabled || !selectedFurniture}
                  onClick={() => {
                    rotateSelection(1)
                  }}
                  aria-keyshortcuts="Q"
                >
                  Rotate Left
                </button>
                <button
                  type="button"
                  className="rotation-button"
                  disabled={!editorInteractionsEnabled || !selectedFurniture}
                  onClick={() => {
                    rotateSelection(-1)
                  }}
                  aria-keyshortcuts="E"
                >
                  Rotate Right
                </button>
              </div>
              <button
                ref={removeButtonRef}
                type="button"
                className="remove-button"
                disabled={!editorInteractionsEnabled || !selectedFurniture}
                aria-haspopup="dialog"
                aria-controls="confirm-delete-dialog"
                onClick={openDeleteDialog}
              >
                Remove Selected
              </button>
            </div>

            {editorMessage ? (
              <p className="editor-message" role="status">
                {editorMessage}
              </p>
            ) : null}
          </section>
          <button
            ref={infoButtonRef}
            type="button"
            className="info-button"
            aria-haspopup="dialog"
            aria-controls="project-info-dialog"
            aria-label="Open project and asset info"
            onClick={openInfoDialog}
          >
            <span aria-hidden>ℹ</span>
          </button>
          <p className="rotation-help">
            <span className="rotation-help-line">
              Select furniture, then use <kbd>Q</kbd>/<kbd>E</kbd> to rotate and{' '}
              <kbd>Delete</kbd>/<kbd>Backspace</kbd> to remove.
            </span>
            <span className="rotation-help-line">
              Use <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo and <kbd>Ctrl</kbd>+
              <kbd>Y</kbd> to redo.
            </span>
          </p>

          <DeleteConfirmationDialog
            dialogRef={confirmDeleteDialogRef}
            pendingDeleteFurniture={pendingDeleteFurniture}
            onCancel={handleDeleteDialogCancel}
            onBackdropClick={handleDeleteDialogClick}
            onClose={closeDeleteDialog}
            onConfirm={confirmRemoveSelection}
          />

          <ProjectInfoDialog
            dialogRef={infoDialogRef}
            onCancel={handleInfoDialogCancel}
            onBackdropClick={handleInfoDialogClick}
            onClose={closeInfoDialog}
          />
        </div>

        <StartupLoadingOverlay visible={startupLoadingActive} />
        {assetError ? (
          <StartupErrorOverlay onRetry={retryAssetLoading} />
        ) : null}
      </div>
    </div>
  )
}

export default App
