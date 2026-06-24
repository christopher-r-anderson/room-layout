import type {
  AddFurnitureResult,
  CameraKeyState,
  CameraPreset,
  MoveSource,
  MoveSelectionResult,
  SelectByIdResult,
  UpdateSelectionTransformResult,
} from '../scene.types'
import type { FurnitureInstance } from '@/domain/furniture'
import type { SceneSnapshot } from './snapshot/scene-snapshot'

export interface SceneServices {
  addFurniture: (catalogId: string) => AddFurnitureResult
  clearSelection: () => void
  deleteSelection: () => boolean
  focusSelected: () => void
  getCameraPosition: () => [number, number, number]
  getSnapshot: () => SceneSnapshot
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
let pendingResolvers: ((services: SceneServices) => void)[] = []

export function registerSceneServices(services: SceneServices) {
  currentSceneServices = services

  if (pendingResolvers.length === 0) {
    return
  }

  const resolvers = pendingResolvers
  pendingResolvers = []
  resolvers.forEach((resolve) => {
    resolve(services)
  })
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

export function whenSceneServicesReady() {
  if (currentSceneServices !== null) {
    return Promise.resolve(currentSceneServices)
  }

  return new Promise<SceneServices>((resolve) => {
    pendingResolvers.push(resolve)
  })
}
