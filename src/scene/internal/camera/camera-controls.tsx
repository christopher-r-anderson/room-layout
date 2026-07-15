import {
  CameraControls as DreiCameraControls,
  type CameraControlsImpl,
} from '@react-three/drei'
import type { RefObject } from 'react'

export function CameraControls({
  enabled = true,
  controlsRef,
  maxDistance = 12,
}: {
  enabled?: boolean
  controlsRef?: RefObject<CameraControlsImpl | null>
  maxDistance?: number
}) {
  return (
    <DreiCameraControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
