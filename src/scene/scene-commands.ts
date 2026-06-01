import {
  clearSceneServices as clearSceneServicesInternal,
  getSceneServices,
  getSceneServicesIfReady,
  whenSceneServicesReady as whenSceneServicesReadyInternal,
} from './internal/scene-services'
import type { FurnitureInstance } from './objects/furniture.types'
import type {
  AddFurnitureResult,
  CameraKeyState,
  CameraPreset,
  MoveSource,
  MoveSelectionResult,
  SelectByIdResult,
  UpdateSelectionTransformResult,
} from './scene.types'

/**
 * Imperative command surface backed by the scene-services registry. App-side
 * code uses these to drive scene mutations that depend on three.js refs and
 * in-component closures (drag state, catalog, source scenes). Reads use
 * `getSceneServicesIfReady` and gracefully degrade when the scene is not
 * mounted; writes throw until the scene registers services.
 */
export const sceneCommands = {
  addFurniture: (catalogId: string): AddFurnitureResult => {
    return getSceneServices().addFurniture(catalogId)
  },
  clearSelection: () => {
    getSceneServices().clearSelection()
  },
  deleteSelection: () => {
    return getSceneServices().deleteSelection()
  },
  focusSelected: () => {
    getSceneServices().focusSelected()
  },
  getCameraPosition: (): [number, number, number] => {
    return getSceneServicesIfReady()?.getCameraPosition() ?? [0, 0, 0]
  },
  getSnapshot: () => {
    return getSceneServicesIfReady()?.getSnapshot() ?? null
  },
  isSceneReady: () => {
    return getSceneServicesIfReady() !== null
  },
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ): MoveSelectionResult => {
    return getSceneServices().moveSelection(delta, options)
  },
  redo: () => {
    return getSceneServices().redo()
  },
  restoreInitialLayout: (instances: FurnitureInstance[]) => {
    getSceneServices().restoreInitialLayout(instances)
  },
  rotateSelection: (deltaRadians: number) => {
    getSceneServices().rotateSelection(deltaRadians)
  },
  selectById: (id: string | null): SelectByIdResult => {
    return getSceneServices().selectById(id)
  },
  setCameraKeyState: (keyState: CameraKeyState) => {
    getSceneServicesIfReady()?.setCameraKeyState(keyState)
  },
  setCameraPreset: (preset: CameraPreset) => {
    getSceneServices().setCameraPreset(preset)
  },
  setSelectionTransform: (input: {
    position?: [number, number, number]
    rotationY?: number
  }): UpdateSelectionTransformResult => {
    return getSceneServices().setSelectionTransform(input)
  },
  undo: () => {
    return getSceneServices().undo()
  },
}

export function clearSceneServices() {
  clearSceneServicesInternal()
}

export function whenSceneServicesReady() {
  return whenSceneServicesReadyInternal()
}
