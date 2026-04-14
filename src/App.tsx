import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene } from './scene/scene'
import { useEffect, useRef, useState } from 'react'
import { getRotationHotkeyDirection } from './lib/ui/rotation-hotkeys'

const ROTATION_STEP_RADIANS = Math.PI / 12

function App() {
  const sceneRef = useRef<{
    clearSelection: () => void
    rotateSelection: (deltaRadians: number) => void
  } | null>(null)
  const infoDialogRef = useRef<HTMLDialogElement | null>(null)
  const infoButtonRef = useRef<HTMLButtonElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const direction = getRotationHotkeyDirection({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isModalOpen: infoDialogRef.current?.open,
        targetTagName:
          target instanceof HTMLElement ? target.tagName : undefined,
        targetIsContentEditable:
          target instanceof HTMLElement ? target.isContentEditable : false,
      })

      if (!selectedId || !direction) {
        return
      }

      event.preventDefault()
      sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedId])

  const rotateSelection = (direction: -1 | 1) => {
    sceneRef.current?.rotateSelection(direction * ROTATION_STEP_RADIANS)
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
        <Scene ref={sceneRef} onSelectionChange={setSelectedId} />
      </Canvas>

      <div className="ui-overlay">
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
        <div
          className="rotation-controls"
          role="toolbar"
          aria-label="Rotation controls"
        >
          <button
            type="button"
            className="rotation-button"
            disabled={!selectedId}
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
            disabled={!selectedId}
            onClick={() => {
              rotateSelection(1)
            }}
            aria-keyshortcuts="E"
          >
            Rotate Right
          </button>
        </div>
        <p className="rotation-help">
          Select furniture, then use <kbd>Q</kbd>/<kbd>E</kbd> or the rotate
          buttons.
        </p>

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
