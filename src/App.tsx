import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene, type SceneRef } from './scene/scene'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getRotationHotkeyDirection } from './lib/ui/rotation-hotkeys'
import { getDeleteHotkeyIntent } from './lib/ui/delete-hotkeys'
import { getHistoryHotkeyIntent } from './lib/ui/history-hotkeys'
import { FURNITURE_CATALOG } from './scene/objects/furniture-catalog'
import type { FurnitureItem } from './scene/objects/furniture.types'

const ROTATION_STEP_RADIANS = Math.PI / 12

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

  const closeDeleteDialog = useCallback(() => {
    confirmDeleteDialogRef.current?.close()
    setPendingDeleteFurniture(null)
    removeButtonRef.current?.focus()
  }, [])

  const openDeleteDialog = useCallback(() => {
    if (!selectedFurniture || confirmDeleteDialogRef.current?.open) {
      return
    }

    setPendingDeleteFurniture(selectedFurniture)
    setEditorMessage(null)
    confirmDeleteDialogRef.current?.showModal()
  }, [selectedFurniture])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [historyAvailability, openDeleteDialog, selectedFurniture])

  const rotateSelection = (direction: -1 | 1) => {
    sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
  }

  const undo = () => {
    sceneRef.current?.undo()
  }

  const redo = () => {
    sceneRef.current?.redo()
  }

  const addFurniture = () => {
    if (!catalogIdToAdd) {
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
    const removed = sceneRef.current?.removeSelection() ?? false

    closeDeleteDialog()

    if (!removed) {
      setEditorMessage('No selected furniture item was available to remove.')
      return
    }

    setEditorMessage(null)
  }

  return (
    <div className="app">
      <Canvas
        className="canvas"
        camera={{
          position: [3, 2.5, 3],
          fov: 50,
        }}
        onPointerMissed={() => {
          sceneRef.current?.clearSelection()
        }}
        shadows
      >
        <color attach="background" args={['#f0f0f0']} />
        <Scene
          ref={sceneRef}
          onSelectionChange={setSelectedFurniture}
          onHistoryChange={setHistoryAvailability}
        />
      </Canvas>

      <div className="ui-overlay">
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
                disabled={!historyAvailability.canUndo}
                onClick={undo}
                aria-keyshortcuts="Control+Z Meta+Z"
              >
                Undo
              </button>
              <button
                type="button"
                className="history-button"
                disabled={!historyAvailability.canRedo}
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
                disabled={!catalogIdToAdd}
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
                disabled={!selectedFurniture}
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
                disabled={!selectedFurniture}
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
              disabled={!selectedFurniture}
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
    </div>
  )
}

export default App
