import { Ray, Vector3 } from 'three'
import { expect, it } from 'vitest'
import {
  clampToBounds,
  getDraggedFurniturePosition,
  getFloorIntersection,
  snapToGrid,
} from './furniture-drag'

it('finds the intersection point with the floor plane', () => {
  const ray = new Ray(new Vector3(1, 4, -2), new Vector3(0, -1, 0))

  const intersection = getFloorIntersection(ray)

  expect(intersection?.toArray()).toEqual([1, 0, -2])
})

it('returns null when the ray does not intersect the floor plane', () => {
  const ray = new Ray(new Vector3(0, 1, 0), new Vector3(1, 0, 0))

  expect(getFloorIntersection(ray)).toBeNull()
})

it('snaps and clamps the dragged furniture position on the floor plane', () => {
  const ray = new Ray(new Vector3(2.26, 3, -3.49), new Vector3(0, -1, 0))

  const position = getDraggedFurniturePosition({
    ray,
    currentY: 0.75,
    dragOffset: { x: 0.24, z: -0.1 },
    bounds: {
      minX: -3,
      maxX: 3,
      minZ: -3,
      maxZ: 3,
    },
    snapSize: 0.5,
  })

  expect(position).toEqual([2.5, 0.75, -3])
})

it('returns the original value when snapping is disabled', () => {
  expect(snapToGrid(1.37, 0)).toBe(1.37)
})

it('clamps values to the provided bounds', () => {
  expect(clampToBounds(-4, -3, 3)).toBe(-3)
  expect(clampToBounds(2, -3, 3)).toBe(2)
  expect(clampToBounds(5, -3, 3)).toBe(3)
})
