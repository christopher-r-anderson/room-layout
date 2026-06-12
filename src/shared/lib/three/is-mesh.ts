import type { Mesh, Object3D } from 'three'

type MeshLike = Object3D & { isMesh?: unknown }

export function isMesh(obj: Object3D): obj is Mesh {
  return (obj as MeshLike).isMesh === true
}
