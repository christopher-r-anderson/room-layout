import { Plane, Ray, Vector3 } from 'three'

const FLOOR_NORMAL = new Vector3(0, 1, 0)
const floorPlaneScratch = new Plane(FLOOR_NORMAL, 0)
const floorIntersectionScratch = new Vector3()

export interface DragBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface DragOffset {
  x: number
  z: number
}

export interface DraggedFurniturePositionOptions {
  ray: Ray
  currentY: number
  dragOffset: DragOffset
  bounds: DragBounds
  snapSize: number
  planeY?: number
}

export function getFloorIntersection(
  ray: Ray,
  planeY = 0,
  target = new Vector3(),
) {
  floorPlaneScratch.set(FLOOR_NORMAL, -planeY)
  return ray.intersectPlane(floorPlaneScratch, target)
}

export function clampToBounds(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function snapToGrid(value: number, snapSize: number) {
  if (snapSize <= 0) {
    return value
  }

  return Math.round(value / snapSize) * snapSize
}

export function getDraggedFurniturePosition({
  ray,
  currentY,
  dragOffset,
  bounds,
  snapSize,
  planeY = 0,
}: DraggedFurniturePositionOptions): [number, number, number] | null {
  const intersection = getFloorIntersection(
    ray,
    planeY,
    floorIntersectionScratch,
  )

  if (!intersection) {
    return null
  }

  const nextX = clampToBounds(
    snapToGrid(intersection.x + dragOffset.x, snapSize),
    bounds.minX,
    bounds.maxX,
  )
  const nextZ = clampToBounds(
    snapToGrid(intersection.z + dragOffset.z, snapSize),
    bounds.minZ,
    bounds.maxZ,
  )

  return [nextX, currentY, nextZ]
}
