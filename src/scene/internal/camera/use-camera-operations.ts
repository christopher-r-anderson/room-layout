import { useCallback, type RefObject } from 'react'
import type { Object3D } from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import { useSelectionStore } from '@/core/stores/selection-store'
import { getVisualObjectBounds } from '@/scene/internal/three/get-visual-object-bounds'
import { CAMERA_PRESETS } from './camera-presets'
import type { CameraKeyState, CameraPreset } from '@/core/scene.types'

interface UseCameraOperationsOptions {
  cameraControlsRef: RefObject<CameraControlsImpl | null>
  cameraKeyStateRef: RefObject<CameraKeyState>
  objectRefs: RefObject<Map<string, Object3D>>
  invalidate: () => void
}

// Camera service handlers: jump to a named preset, record held-key state for
// continuous motion, and frame the selected object. Extracted from the Scene
// component to give camera control one home.
export function useCameraOperations({
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
    const { selectedId } = useSelectionStore.getState()
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
    setCameraKeyState,
    focusSelected,
  }
}
