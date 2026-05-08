import {
  CameraControls as DreiCameraControls,
  type CameraControlsImpl,
} from '@react-three/drei'
import { useEffect, useRef, type RefObject } from 'react'

export function CameraControls({
  enabled = true,
  controlsRef,
}: {
  enabled?: boolean
  controlsRef?: RefObject<CameraControlsImpl | null>
}) {
  const internalRef = useRef<CameraControlsImpl | null>(null)

  useEffect(() => {
    const ctrl = internalRef.current
    if (!ctrl) return
    // Disable right-click pan and two-finger pan; keep right-click and two-finger as rotate.
    // ACTION.NONE = 0, ACTION.TOUCH_ROTATE = 64 (camera-controls@3.x constants).
    ctrl.mouseButtons.right = 0
    ctrl.touches.two = 64

    if (controlsRef) {
      controlsRef.current = ctrl
    }
  }, [controlsRef])

  return (
    <DreiCameraControls
      ref={internalRef}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
