import { Mesh, Object3D } from 'three'
import { isMesh } from './is-mesh'

export function getMeshes(object: Object3D) {
  const meshes: Mesh[] = []
  object.traverse((child) => {
    if (isMesh(child)) {
      meshes.push(child)
    }
  })
  return meshes
}
