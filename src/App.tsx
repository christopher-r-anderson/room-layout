import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene, type SceneRef } from './scene/scene'
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
import { useProgress } from '@react-three/drei'
import { getRotationHotkeyDirection } from './lib/ui/rotation-hotkeys'
import { getDeleteHotkeyIntent } from './lib/ui/delete-hotkeys'
import { getHistoryHotkeyIntent } from './lib/ui/history-hotkeys'
import {
  clearFurnitureCollectionCache,
  FURNITURE_CATALOG,
  preloadFurnitureCollections,
} from './scene/objects/furniture-catalog'
import type { FurnitureItem } from './scene/objects/furniture.types'

const ROTATION_STEP_RADIANS = Math.PI / 12

function formatAssetLabel(item: string) {
  if (!item) {
    return 'Preparing furniture assets...'
  }

  const normalizedItem = item.split('?')[0]
  const filename = normalizedItem.split('/').pop()

  return filename ?? normalizedItem
}

function StartupLoadingOverlay({ visible }: { visible: boolean }) {
  const { active, item, loaded, progress, total } = useProgress()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const roundedProgress = useMemo(() => {
    if (Number.isNaN(progress)) {
      return 0
    }

    return Math.max(0, Math.min(100, Math.round(progress)))
  }, [progress])

  useEffect(() => {
    if (!visible) {
      return
    }

    panelRef.current?.focus()
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    <section className="startup-overlay" aria-live="polite">
      <div
        ref={panelRef}
        className="startup-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-loading-title"
        aria-describedby="startup-loading-description startup-loading-progress-label"
        tabIndex={-1}
      >
        <p className="startup-overlay-eyebrow">Loading scene assets</p>
        <h2 id="startup-loading-title" className="startup-overlay-title">
          Preparing the room editor
        </h2>
        <p id="startup-loading-description" className="startup-overlay-copy">
          The editor will unlock after the required furniture models finish
          loading.
        </p>
        <div
          className="startup-progress"
          role="progressbar"
          aria-label="Furniture asset loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedProgress}
        >
          <div
            className="startup-progress-bar"
            style={{ width: `${String(roundedProgress)}%` }}
          />
        </div>
        <div className="startup-progress-summary">
          <strong>{String(roundedProgress)}%</strong>
          <span>
            {active && total > 0
              ? `Asset ${String(Math.min(loaded + 1, total))} of ${String(total)}`
              : 'Starting asset requests'}
          </span>
        </div>
        <p
          id="startup-loading-progress-label"
          className="startup-progress-label"
        >
          Current item: {formatAssetLabel(item)}
        </p>
      </div>
    </section>
  )
}

function StartupErrorOverlay({ onRetry }: { onRetry: () => void }) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <section className="startup-overlay" aria-live="assertive">
      <div
        className="startup-overlay-panel startup-overlay-panel-error"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="startup-error-title"
        aria-describedby="startup-error-description startup-error-note"
      >
        <p className="startup-overlay-eyebrow">Asset loading failed</p>
        <h2 id="startup-error-title" className="startup-overlay-title">
          The room editor could not start
        </h2>
        <p id="startup-error-description" className="startup-overlay-copy">
          A required furniture model did not load correctly, so editor
          interactions are temporarily unavailable.
        </p>
        <p id="startup-error-note" className="startup-overlay-note">
          Retry to request the essential assets again.
        </p>
        <div className="startup-overlay-actions">
          <button
            ref={retryButtonRef}
            type="button"
            className="history-button"
            onClick={onRetry}
          >
            Retry Loading
          </button>
        </div>
      </div>
    </section>
  )
}

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
  const [assetsReady, setAssetsReady] = useState(false)
  const [assetError, setAssetError] = useState<Error | null>(null)
  const [sceneVersion, setSceneVersion] = useState(0)

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

  const editorInteractionsEnabled = assetsReady && assetError === null
  const startupLoadingActive = !assetsReady && assetError === null
  const startupOverlayActive = startupLoadingActive || assetError !== null

  useEffect(() => {
    preloadFurnitureCollections()
  }, [])

  const handleAssetsReady = useCallback(() => {
    setAssetsReady(true)
    setAssetError(null)
  }, [])

  const handleAssetError = useCallback(
    (error: Error) => {
      setAssetsReady(false)
      setAssetError(error)
      confirmDeleteDialogRef.current?.close()
      infoDialogRef.current?.close()
      resetEditorShellState()
    },
    [resetEditorShellState],
  )

  const retryAssetLoading = useCallback(() => {
    clearFurnitureCollectionCache()
    setAssetsReady(false)
    setAssetError(null)
    confirmDeleteDialogRef.current?.close()
    infoDialogRef.current?.close()
    resetEditorShellState()
    setSceneVersion((currentVersion) => currentVersion + 1)
  }, [resetEditorShellState])

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!editorInteractionsEnabled) {
        return
      }

      const target = event.target
      const isModalOpen =
        Boolean(infoDialogRef.current?.open) ||
        Boolean(confirmDeleteDialogRef.current?.open)
      const targetTagName =
        target instanceof HTMLElement ? target.tagName : undefined
      const targetIsContentEditable =
        target instanceof HTMLElement ? target.isContentEditable : false
      const historyIntent = getHistoryHotkeyIntent({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        isModalOpen,
        targetTagName,
        targetIsContentEditable,
      })
      const deleteIntent = getDeleteHotkeyIntent({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isModalOpen,
        targetTagName,
        targetIsContentEditable,
      })
      const direction = getRotationHotkeyDirection({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isModalOpen,
        targetTagName,
        targetIsContentEditable,
      })

      if (historyIntent === 'undo' && historyAvailability.canUndo) {
        event.preventDefault()
        sceneRef.current?.undo()
        return
      }

      if (historyIntent === 'redo' && historyAvailability.canRedo) {
        event.preventDefault()
        sceneRef.current?.redo()
        return
      }

      if (selectedFurniture && deleteIntent) {
        event.preventDefault()
        openDeleteDialog()
        return
      }

      if (!selectedFurniture || !direction) {
        return
      }

      event.preventDefault()
      sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    editorInteractionsEnabled,
    historyAvailability,
    openDeleteDialog,
    selectedFurniture,
  ])

  const rotateSelection = (direction: -1 | 1) => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
  }

  const undo = () => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.undo()
  }

  const redo = () => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.redo()
  }

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
                    rotateSelection(-1)
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
                    rotateSelection(1)
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

          <dialog
            ref={confirmDeleteDialogRef}
            id="confirm-delete-dialog"
            className="confirm-dialog"
            aria-labelledby="confirm-delete-title"
            onCancel={handleDeleteDialogCancel}
            onClick={handleDeleteDialogClick}
          >
            <div className="confirm-dialog-content">
              <h2 id="confirm-delete-title">Remove furniture?</h2>
              <p>
                Remove{' '}
                <strong>
                  {pendingDeleteFurniture?.name ?? 'the selected item'}
                </strong>{' '}
                from the room layout?
              </p>
              <p className="confirm-delete-note">
                You can undo this from the history controls after removing it.
              </p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="close-button"
                  onClick={closeDeleteDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={confirmRemoveSelection}
                >
                  Remove
                </button>
              </div>
            </div>
          </dialog>

          <dialog
            ref={infoDialogRef}
            id="project-info-dialog"
            className="info-dialog"
            aria-labelledby="project-info-title"
            onCancel={handleInfoDialogCancel}
            onClick={handleInfoDialogClick}
          >
            <div className="info-dialog-content">
              <h2 id="project-info-title">Project Info</h2>

              <section aria-labelledby="project-links-heading">
                <h3 id="project-links-heading">Repository</h3>
                <p>
                  Source code:{' '}
                  <a
                    href="https://github.com/christopher-r-anderson/room-layout"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/christopher-r-anderson/room-layout{' '}
                    <span aria-hidden>↗</span>
                  </a>
                </p>
              </section>

              <section aria-labelledby="asset-attribution-heading">
                <h3 id="asset-attribution-heading">Asset Attribution</h3>
                <p>
                  Leather Couch model by{' '}
                  <a
                    href="https://sketchfab.com/YouSaveTime"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    YouSaveTime <span aria-hidden>↗</span>
                  </a>
                  , from{' '}
                  <a
                    href="https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sketchfab <span aria-hidden>↗</span>
                  </a>
                  , licensed under CC BY 4.0.
                </p>
                <p>
                  Local source details:{' '}
                  <code>
                    assets-source/leather-couch/leather-couch-source.txt
                  </code>
                </p>
              </section>

              <form method="dialog" className="info-dialog-actions">
                <button
                  type="button"
                  className="close-button"
                  onClick={closeInfoDialog}
                >
                  Close
                </button>
              </form>
            </div>
          </dialog>
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
