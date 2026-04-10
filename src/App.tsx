import { Canvas } from '@react-three/fiber'
import './App.css'
import { Scene } from './scene/scene'

function App() {
  return (
    <div className="app">
      <Canvas
        className="canvas"
        camera={{
          position: [3, 2.5, 3],
          fov: 50,
        }}
        shadows
      >
        <color attach="background" args={['#f0f0f0']} />
        <Scene />
      </Canvas>

      <div className="ui-overlay" />
    </div>
  )
}

export default App
