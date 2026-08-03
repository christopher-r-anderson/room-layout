import {
  CameraControls as DreiCameraControls,
  type CameraControlsImpl,
} from '@react-three/drei'
import type { RefObject } from 'react'

export function CameraControls({
  enabled = true,
  controlsRef,
  maxDistance,
}: {
  enabled?: boolean
  controlsRef?: RefObject<CameraControlsImpl | null>
  maxDistance: number
}) {
  return (
    <DreiCameraControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={maxDistance}
      // Keeps the camera above the floor plane; the margin stops the orbit
      // from degenerating at the horizon.
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
