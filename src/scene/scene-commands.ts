import {
  clearSceneServices as clearSceneServicesInternal,
  getSceneServices,
  getSceneServicesIfReady,
} from './internal/scene-services'
import {
  ensureCollectionLoaded,
  getCollectionFailureKind,
  resetCollectionScenes,
} from './internal/furniture/collection-scenes-store'
import type { FurnitureInstance } from '@/domain/furniture'
import type { CollectionLoadFailureKind } from './scene.types'

// Hook halves of the on-demand loader surface, exposed here (a component-free
// contract module) so scene-canvas / the catalog can import them without
// breaking react-refresh.
export {
  useActiveOnDemandCollectionPaths,
  useFailedCollections,
} from './internal/furniture/collection-scenes-store'
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
 * in-component closures (drag state, catalog, source scenes).
 *
 * Readiness policy (two tiers):
 *
 * - Reads and best-effort continuous input use `getSceneServicesIfReady` and
 *   degrade to a safe default when the scene is not mounted, so callers may call
 *   them anytime without guarding.
 * - Discrete mutations use `getSceneServices` and throw if the scene has not
 *   registered. The throw is a loud "mutation attempted without a ready scene"
 *   signal, not an error to catch. The decision of whether to tolerate a
 *   not-ready scene is the caller's: operations for which "not ready" is an
 *   expected transient (user gestures during startup/teardown) guard with
 *   `isSceneReady()` and skip the whole operation; load-critical callers with a
 *   guaranteed-ready scene (startup restore, reset) intentionally do not guard,
 *   so a broken readiness assumption surfaces instead of silently no-op-ing.
 */
export const sceneCommands = {
  // Reads + best-effort input — degrade when the scene is not mounted.
  isSceneReady: () => {
    return getSceneServicesIfReady() !== null
  },
  getCameraPosition: (): [number, number, number] => {
    return getSceneServicesIfReady()?.getCameraPosition() ?? [0, 0, 0]
  },
  getSnapshot: () => {
    return getSceneServicesIfReady()?.getSnapshot() ?? null
  },
  setCameraKeyState: (keyState: CameraKeyState) => {
    getSceneServicesIfReady()?.setCameraKeyState(keyState)
  },

  // On-demand collection loading. Resolves once the collection at `sourcePath`
  // is parsed and registered, so the add flow can await a not-yet-loaded model
  // before dispatching addFurniture. Loading is driven reactively (the wanted
  // set mounts a loader), so this does not require a registered scene service.
  ensureCollectionLoaded: (sourcePath: string): Promise<void> => {
    return ensureCollectionLoaded(sourcePath)
  },
  // Why a collection's on-demand load failed, or null. The add flow reads this
  // after a rejected ensureCollectionLoaded to message by cause.
  getCollectionFailureKind: (
    sourcePath: string,
  ): CollectionLoadFailureKind | null => {
    return getCollectionFailureKind(sourcePath)
  },
  // Drops all loaded/wanted collection state. Called on error/retry teardown
  // (before the scene epoch remounts) so a fresh cycle starts clean.
  resetCollections: () => {
    resetCollectionScenes()
  },

  // Mutations — require a ready scene; throw otherwise (see policy above).
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
