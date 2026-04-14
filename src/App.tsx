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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const direction = getRotationHotkeyDirection({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
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
      </div>
    </div>
  )
}

export default App
