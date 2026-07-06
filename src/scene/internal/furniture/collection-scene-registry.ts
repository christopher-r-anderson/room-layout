import type { Object3D } from 'three'
import {
  getParsedCollectionScenes,
  registerParsedCollectionScene,
  useParsedCollectionScenes,
} from '@/core/stores/collection-scene-registry'

// Typed scene-layer face of core's opaque parsed-collection registry: the
// engine is the only writer and the only consumer that knows the values are
// Object3D roots.
export function registerCollectionScene(path: string, scene: Object3D) {
  registerParsedCollectionScene(path, scene)
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return getParsedCollectionScenes() as Map<string, Object3D>
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useParsedCollectionScenes() as Map<string, Object3D>
}
