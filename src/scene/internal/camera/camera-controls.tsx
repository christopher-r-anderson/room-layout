import {
  CameraControls as DreiCameraControls,
  type CameraControlsImpl,
} from '@react-three/drei'
import type { RefObject } from 'react'

export function CameraControls({
  enabled = true,
  controlsRef,
}: {
  enabled?: boolean
  controlsRef?: RefObject<CameraControlsImpl | null>
}) {
  return (
    <DreiCameraControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
