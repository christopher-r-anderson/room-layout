import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import type { CameraControlsImpl } from '@react-three/drei'
import type { CameraKeyState } from '@/core/scene.types'

interface UseCameraKeyMotionOptions {
  cameraControlsRef: RefObject<CameraControlsImpl | null>
  cameraKeyStateRef: RefObject<CameraKeyState>
}

/**
 * Applies continuous camera motion from held-key state each frame: WASD orbit,
 * Shift+WASD pan, and +/- dolly. Speeds are tuned for the 6x6 meter room scale.
 */
export function useCameraKeyMotion({
  cameraControlsRef,
  cameraKeyStateRef,
}: UseCameraKeyMotionOptions) {
  useFrame((state, delta) => {
    const controls = cameraControlsRef.current
    if (!controls) {
      return
    }

    const keyState = cameraKeyStateRef.current
    if (keyState.size === 0) {
      return
    }

    const deltaTime = Math.min(delta, 0.05) // Cap delta to prevent large jumps after frame stalls

    const ROTATION_SPEED = 1.5 // radians per second
    const TRUCK_SPEED = 3.0 // units per second
    const DOLLY_SPEED = 3.0 // units per second

    const hasShift = keyState.has('shift')

    if (keyState.has('keyW') && !hasShift) {
      void controls.rotate(0, -ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && !hasShift) {
      void controls.rotate(0, ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && !hasShift) {
      void controls.rotate(-ROTATION_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && !hasShift) {
      void controls.rotate(ROTATION_SPEED * deltaTime, 0, false)
    }

    if (keyState.has('keyW') && hasShift) {
      void controls.truck(0, -TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && hasShift) {
      void controls.truck(0, TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && hasShift) {
      void controls.truck(-TRUCK_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && hasShift) {
      void controls.truck(TRUCK_SPEED * deltaTime, 0, false)
    }

    const hasEqual = keyState.has('equal')
    const hasMinus = keyState.has('minus')
    if (hasEqual || hasMinus) {
      const dollyDistance = hasEqual
        ? DOLLY_SPEED * deltaTime
        : -DOLLY_SPEED * deltaTime
      void controls.dolly(dollyDistance, false)
    }

    // frameloop="demand" keep-alive; the size === 0 early return above lets
    // the loop settle once keys are released.
    state.invalidate()
  })
}
