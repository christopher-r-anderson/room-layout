import type { Object3D } from 'three'
import {
  getParsedCollectionScenes,
  registerParsedCollectionScene,
  useParsedCollectionScenes,
  type CollectionNodeDefaults,
} from '@/core/stores/collection-scene-registry'

// Depth-first like Object3D.getObjectByName, so the first node wins when names
// repeat.
function extractNodeDefaults(
  scene: Object3D,
): Map<string, CollectionNodeDefaults> {
  const defaults = new Map<string, CollectionNodeDefaults>()
  scene.traverse((node) => {
    if (node.name && !defaults.has(node.name)) {
      defaults.set(node.name, {
        position: [node.position.x, node.position.y, node.position.z],
        rotationY: node.rotation.y,
      })
    }
  })
  return defaults
}

/**
 * The scene layer alone knows the registry values are Object3D roots; node
 * default transforms are extracted here so core-side mutations can seed items
 * from plain data.
 */
export function registerCollectionScene(path: string, scene: Object3D) {
  registerParsedCollectionScene(path, scene, extractNodeDefaults(scene))
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return getParsedCollectionScenes() as Map<string, Object3D>
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useParsedCollectionScenes() as Map<string, Object3D>
}
