import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { getVisualObjectBounds } from './get-visual-object-bounds'

describe('getVisualObjectBounds', () => {
  it('reuses cached geometry bounding boxes', () => {
    const geometry = new BoxGeometry(1, 2, 3)
    const computeBoundingBox = vi.spyOn(geometry, 'computeBoundingBox')
    const mesh = new Mesh(geometry, new MeshBasicMaterial())

    getVisualObjectBounds(mesh)
    getVisualObjectBounds(mesh)

    expect(computeBoundingBox).toHaveBeenCalledTimes(1)
  })
})
