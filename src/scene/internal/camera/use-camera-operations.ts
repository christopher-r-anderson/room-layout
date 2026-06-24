import { useCallback, type RefObject } from 'react'
import type { Camera, Object3D } from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import { sceneDocumentStore } from '@/core/scene-contracts'
import { getVisualObjectBounds } from '../three/get-visual-object-bounds'
import { CAMERA_PRESETS, type CameraPreset } from './camera-presets'
import type { CameraKeyState } from '../../scene.types'

function roundCameraCoordinate(value: number) {
  return Math.round(value * 1000) / 1000
}

interface UseCameraOperationsOptions {
  camera: Camera
  cameraControlsRef: RefObject<CameraControlsImpl | null>
  cameraKeyStateRef: RefObject<CameraKeyState>
  objectRefs: RefObject<Map<string, Object3D>>
  invalidate: () => void
}

// Camera service handlers: jump to a named preset, read the rounded camera
// position, record held-key state for continuous motion, and frame the selected
// object. Extracted from the Scene component to give camera control one home.
export function useCameraOperations({
  camera,
  cameraControlsRef,
  cameraKeyStateRef,
  objectRefs,
  invalidate,
}: UseCameraOperationsOptions) {
  const setCameraPreset = useCallback(
    (preset: CameraPreset) => {
      const view = CAMERA_PRESETS[preset]
      void cameraControlsRef.current?.setLookAt(
        ...view.position,
        ...view.target,
        true,
      )
    },
    [cameraControlsRef],
  )

  const getCameraPosition = useCallback(() => {
    return camera.position.toArray().map((coordinate) => {
      return roundCameraCoordinate(coordinate)
    }) as [number, number, number]
  }, [camera])

  const setCameraKeyState = useCallback(
    (keyState: CameraKeyState) => {
      cameraKeyStateRef.current = keyState

      if (keyState.size > 0) {
        invalidate()
      }
    },
    [cameraKeyStateRef, invalidate],
  )

  const focusSelected = useCallback(() => {
    const { selectedId } = sceneDocumentStore.getState()
    const controls = cameraControlsRef.current

    if (!controls || !selectedId) {
      return
    }

    const object = objectRefs.current.get(selectedId)

    if (!object) {
      return
    }

    const bounds = getVisualObjectBounds(object)

    if (!bounds) {
      return
    }

    void controls.fitToBox(bounds, true, {
      paddingTop: 0.5,
      paddingBottom: 0.5,
      paddingLeft: 0.5,
      paddingRight: 0.5,
    })
  }, [cameraControlsRef, objectRefs])

  return {
    setCameraPreset,
    getCameraPosition,
    setCameraKeyState,
    focusSelected,
  }
}
