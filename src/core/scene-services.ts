import type { CameraKeyState, CameraPreset, SceneSnapshot } from './scene.types'

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

export function registerSceneServices(services: SceneServices) {
  currentSceneServices = services
}

export function clearSceneServices() {
  currentSceneServices = null
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
