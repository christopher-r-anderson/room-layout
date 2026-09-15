import { getSceneServices, getSceneServicesIfReady } from './scene-services'
import type { CameraKeyState, CameraPreset } from './scene.types'

/**
 * Imperative commands backed by the scene-services registry; document
 * mutations live in core/operations and never pass through here.
 *
 * Readiness: reads and continuous input degrade to a safe default when no
 * scene is mounted; `loadCollectionScene` and the discrete camera commands
 * throw instead - callers for which "not ready" is an expected transient
 * guard with `isSceneReady()` and skip the operation.
 */
export const sceneCommands = {
  // Reads + best-effort input - degrade when the scene is not mounted.
  isSceneReady: () => {
    return getSceneServicesIfReady() !== null
  },
  getSnapshot: () => {
    return getSceneServicesIfReady()?.getSnapshot() ?? null
  },
  setCameraKeyState: (keyState: CameraKeyState) => {
    getSceneServicesIfReady()?.setCameraKeyState(keyState)
  },

  // Engine work - requires a ready scene; throws otherwise (see policy above).
  loadCollectionScene: (path: string, bytes: ArrayBuffer): Promise<void> => {
    return getSceneServices().loadCollectionScene(path, bytes)
  },
  focusSelected: () => {
    getSceneServices().focusSelected()
  },
  setCameraPreset: (preset: CameraPreset) => {
    getSceneServices().setCameraPreset(preset)
  },
}
