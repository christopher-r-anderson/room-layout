import { Mesh, Object3D } from 'three'
import { isMesh } from './is-mesh'
import { isUiBoundsObject } from './ui-bounds'

export function getMeshes(
  object: Object3D,
  options?: { includeUiBounds?: boolean },
) {
  const meshes: Mesh[] = []
  object.traverse((child) => {
    if (
      isMesh(child) &&
      (options?.includeUiBounds === true || !isUiBoundsObject(child))
    ) {
      meshes.push(child)
    }
  })
  return meshes
}
