import type { Object3D } from 'three'

export function getClonedNode(scene: Object3D, name: string) {
  const node = scene.getObjectByName(name)
  if (!node) {
    throw new Error(`${name} node not found in GLTF scene`)
  }
  return node.clone(true)
}
