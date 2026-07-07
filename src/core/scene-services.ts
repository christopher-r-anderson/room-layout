import type { CameraKeyState, CameraPreset, SceneSnapshot } from './scene.types'
import { editorLifecycleActions } from './stores/editor-lifecycle-store'

// The engine port: the viewport services only the mounted scene can provide.
// Document mutations are core operations and do not pass through here.
export interface SceneServices {
  focusSelected: () => void
  getSnapshot: () => SceneSnapshot
  // Parse a collection's GLB bytes and register the scene root in the
  // collection registry (see collection-scene-loader). Core awaits this from
  // its load pipeline before marking the collection loaded.
  loadCollectionScene: (path: string, bytes: ArrayBuffer) => Promise<void>
  setCameraKeyState: (keyState: CameraKeyState) => void
  setCameraPreset: (preset: CameraPreset) => void
}

let currentSceneServices: SceneServices | null = null

// register/clear are the single producer of the lifecycle store's reactive
// sceneReady flag, so the flag and isSceneReady() can never disagree. The
// registry is written before the flag flips: zustand notifies subscribers
// synchronously, and a subscriber woken by `sceneReady` must find the
// services already in place.
export function registerSceneServices(services: SceneServices) {
  currentSceneServices = services
  editorLifecycleActions.setSceneReady(true)
}

export function clearSceneServices() {
  currentSceneServices = null
  editorLifecycleActions.setSceneReady(false)
}

export function getSceneServices() {
  if (currentSceneServices === null) {
    throw new Error('scene services not registered')
  }

  return currentSceneServices
}

export function getSceneServicesIfReady() {
  return currentSceneServices
}
