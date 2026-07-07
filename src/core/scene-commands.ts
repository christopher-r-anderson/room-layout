import { getSceneServices, getSceneServicesIfReady } from './scene-services'
import type { CameraKeyState, CameraPreset } from './scene.types'

/**
 * Imperative command surface backed by the scene-services registry: the
 * viewport services (camera, screen-space snapshot) and the GL-bound asset
 * parse that only the mounted engine can provide. Document mutations live in
 * core/operations and never pass through here.
 *
 * Readiness policy (two tiers):
 *
 * - Reads and best-effort continuous input use `getSceneServicesIfReady` and
 *   degrade to a safe default when the scene is not mounted, so callers may call
 *   them anytime without guarding.
 * - `loadCollectionScene` and the discrete camera commands use
 *   `getSceneServices` and throw if the scene has not registered. The throw is
 *   a loud "engine work attempted without a ready scene" signal, not an error
 *   to catch; callers for which "not ready" is an expected transient guard with
 *   `isSceneReady()` and skip the operation.
 */
export const sceneCommands = {
  // Reads + best-effort input — degrade when the scene is not mounted.
  isSceneReady: () => {
    return getSceneServicesIfReady() !== null
  },
  getSnapshot: () => {
    return getSceneServicesIfReady()?.getSnapshot() ?? null
  },
  setCameraKeyState: (keyState: CameraKeyState) => {
    getSceneServicesIfReady()?.setCameraKeyState(keyState)
  },

  // Engine work — requires a ready scene; throws otherwise (see policy above).
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
