import { Environment, Lightformer } from '@react-three/drei'
import { BackSide } from 'three'
import type { LightingMoodOption } from '@/domain/environment-materials'
import { resolveLightingMood } from './lighting-mood'

export function Lighting({
  lowQuality = false,
  mood = null,
  shadowExtent = 5.5,
}: {
  lowQuality?: boolean
  mood?: LightingMoodOption | null
  /** Half-size of the key light's shadow frustum; must cover the floor. */
  shadowExtent?: number
}) {
  const m = resolveLightingMood(mood)

  if (lowQuality) {
    return (
      <>
        <ambientLight intensity={m.ambientIntensity} />
        <hemisphereLight
          args={[
            m.hemisphereSkyColor,
            m.hemisphereGroundColor,
            m.hemisphereIntensity,
          ]}
        />
        <directionalLight
          position={[4.2, 6.2, -2.6]}
          intensity={m.keyLightIntensity}
          color={m.keyLightColor}
        />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={m.ambientIntensity} />
      <hemisphereLight
        args={[
          m.hemisphereSkyColor,
          m.hemisphereGroundColor,
          m.hemisphereIntensity,
        ]}
      />
      <directionalLight
        position={[4.2, 6.2, -2.6]}
        intensity={m.keyLightIntensity}
        color={m.keyLightColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
        shadow-radius={4}
      />
      <directionalLight
        position={[-3.5, 4.5, -4]}
        intensity={m.fillLightIntensity}
        color={m.fillLightColor}
      />
      <Environment
        background
        resolution={256}
        backgroundBlurriness={0.18}
        backgroundIntensity={m.backgroundIntensity}
        environmentIntensity={m.environmentIntensity}
      >
        <mesh scale={90}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial color={m.environmentColor} side={BackSide} />
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
