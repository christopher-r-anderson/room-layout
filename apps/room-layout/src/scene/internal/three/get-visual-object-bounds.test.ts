import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { getVisualObjectBounds } from './get-visual-object-bounds'

function boxMesh(size: number, position: [number, number, number]) {
  const mesh = new Mesh(
    new BoxGeometry(size, size, size),
    new MeshBasicMaterial(),
  )
  mesh.position.set(...position)
  return mesh
}

function markUiBounds(mesh: Mesh) {
  mesh.userData.roomLayoutRole = 'ui-bounds'
  return mesh
}

describe('getVisualObjectBounds', () => {
  it('returns the world-space union of the descendant meshes', () => {
    const group = new Group()
    group.add(boxMesh(2, [0, 0, 0])) // [-1,-1,-1]..[1,1,1]
    group.add(boxMesh(2, [5, 0, 0])) // [4,-1,-1]..[6,1,1]

    const bounds = getVisualObjectBounds(group)

    expect(bounds?.min.toArray()).toEqual([-1, -1, -1])
    expect(bounds?.max.toArray()).toEqual([6, 1, 1])
  })

  it('excludes ui-bounds meshes from the union', () => {
    const group = new Group()
    group.add(boxMesh(2, [0, 0, 0]))
    group.add(markUiBounds(boxMesh(2, [5, 0, 0])))

    const bounds = getVisualObjectBounds(group)

    // The ui-bounds box at x=5 must not stretch the union past the real mesh.
    expect(bounds?.max.toArray()).toEqual([1, 1, 1])
  })

  it('returns null when no qualifying mesh contributes bounds', () => {
    const group = new Group()
    group.add(markUiBounds(boxMesh(2, [0, 0, 0])))

    expect(getVisualObjectBounds(group)).toBeNull()
  })

  it('reuses cached geometry bounding boxes', () => {
    const geometry = new BoxGeometry(1, 2, 3)
    const computeBoundingBox = vi.spyOn(geometry, 'computeBoundingBox')
    const mesh = new Mesh(geometry, new MeshBasicMaterial())

    getVisualObjectBounds(mesh)
    getVisualObjectBounds(mesh)

    expect(computeBoundingBox).toHaveBeenCalledTimes(1)
  })
})
