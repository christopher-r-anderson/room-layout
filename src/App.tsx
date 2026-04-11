import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene } from './scene/scene'
import { useRef } from 'react'

function App() {
  const sceneRef = useRef<{ clearSelection: () => void } | null>(null)
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
        <Scene ref={sceneRef} />
      </Canvas>

      <div className="ui-overlay" />
    </div>
  )
}

export default App
