import { Environment, Lightformer } from '@react-three/drei'
import { BackSide } from 'three'

export function Lighting({ lowQuality = false }: { lowQuality?: boolean }) {
  if (lowQuality) {
    return (
      <>
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#edf2f8', '#bcc5d1', 0.4]} />
        <directionalLight
          position={[4.2, 6.2, -2.6]}
          intensity={0.7}
          color="#fff4e6"
        />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#f1f6ff', '#aeb9c9', 0.55]} />
      <directionalLight
        position={[4.2, 6.2, -2.6]}
        intensity={1.0}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5.5}
        shadow-camera-right={5.5}
        shadow-camera-top={5.5}
        shadow-camera-bottom={-5.5}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-radius={4}
      />
      <directionalLight
        position={[-3.5, 4.5, -4]}
        intensity={0.28}
        color="#d5e4ff"
      />
      <Environment
        background
        resolution={256}
        backgroundBlurriness={0.18}
        backgroundIntensity={0.95}
        environmentIntensity={0.72}
      >
        <mesh scale={90}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color="#dce6f3" side={BackSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#fff0e0"
          scale={[12, 5, 1]}
          position={[9, 5, -6]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.7}
          color="#d8e8ff"
          scale={6}
          position={[-7, 4, 5]}
          target={[0, 1, 0]}
        />
      </Environment>
    </>
  )
}
