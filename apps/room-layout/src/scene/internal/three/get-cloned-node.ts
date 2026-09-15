import type { Object3D } from 'three'

/**
 * clone(true) copies the node tree but shares geometry and material with the
 * registry's source scene: per-instance fields (castShadow, visible,
 * userData) are safe to mutate; materials are not, and nothing on the clone
 * may be disposed.
 */
export function getClonedNode(scene: Object3D, name: string) {
  const node = scene.getObjectByName(name)
  if (!node) {
    throw new Error(`${name} node not found in GLTF scene`)
  }
  return node.clone(true)
}
