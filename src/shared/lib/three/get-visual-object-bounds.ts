import { Box3, type Object3D } from 'three'
import { isMesh } from './is-mesh'
import { isUiBoundsObject } from './ui-bounds'

export function getVisualObjectBounds(object: Object3D) {
  object.updateWorldMatrix(true, true)

  const bounds = new Box3().makeEmpty()
  const meshBounds = new Box3()

  object.traverse((child) => {
    if (!isMesh(child) || isUiBoundsObject(child)) {
      return
    }

    if (child.geometry.boundingBox === null) {
      child.geometry.computeBoundingBox()
    }

    const boundingBox = child.geometry.boundingBox
    if (boundingBox === null) {
      return
    }

    meshBounds.copy(boundingBox).applyMatrix4(child.matrixWorld)
    bounds.union(meshBounds)
  })

  return bounds.isEmpty() ? null : bounds
}
