import type { Mesh, Object3D } from 'three'

const UI_BOUNDS_ROLE = 'ui-bounds'

export function isUiBoundsObject(object: Object3D) {
  return object.userData.roomLayoutRole === UI_BOUNDS_ROLE
}

export function markUiBoundsSubtree(root: Object3D) {
  root.traverse((child) => {
    child.userData.roomLayoutRole = UI_BOUNDS_ROLE
    child.visible = false

    const meshLike = child as Object3D & Partial<Mesh>
    if ('castShadow' in meshLike) {
      meshLike.castShadow = false
    }
    if ('receiveShadow' in meshLike) {
      meshLike.receiveShadow = false
    }
    if ('raycast' in meshLike && typeof meshLike.raycast === 'function') {
      meshLike.raycast = () => undefined
    }
  })
}
