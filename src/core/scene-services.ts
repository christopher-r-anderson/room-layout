import type {
  AddFurnitureResult,
  CameraKeyState,
  CameraPreset,
  MoveSource,
  MoveSelectionResult,
  SelectByIdResult,
  UpdateSelectionTransformResult,
  SceneSnapshot,
} from './scene.types'
import type { FurnitureInstance } from '@/domain/furniture'

export interface SceneServices {
  addFurniture: (catalogId: string) => AddFurnitureResult
  clearSelection: () => void
  deleteSelection: () => boolean
  focusSelected: () => void
  getCameraPosition: () => [number, number, number]
  getSnapshot: () => SceneSnapshot
  // Parse a collection's GLB bytes and register the scene root in the
  // collection registry (see collection-scene-loader). Core awaits this from
  // its load pipeline before marking the collection loaded.
  loadCollectionScene: (path: string, bytes: ArrayBuffer) => Promise<void>
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  restoreInitialLayout: (instances: FurnitureInstance[]) => void
  rotateSelection: (deltaRadians: number) => void
  undo: () => boolean
  redo: () => boolean
  selectById: (id: string | null) => SelectByIdResult
  setCameraKeyState: (keyState: CameraKeyState) => void
  setCameraPreset: (preset: CameraPreset) => void
  setSelectionTransform: (input: {
    position?: [number, number, number]
    rotationY?: number
  }) => UpdateSelectionTransformResult
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
