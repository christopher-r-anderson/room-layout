import type { FootprintSize } from '@/scene/objects/furniture.types'
import {
  footprintsOverlap,
  getEdgeSnapDelta,
  getFootprintBounds,
} from './furniture-footprint'

export interface FurnitureLayoutItem {
  id: string
  position: [number, number, number]
  rotationY: number
  footprintSize: FootprintSize
}

export interface LayoutBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface ResolveMovedFurniturePositionOptions {
  movingId: string
  proposedPosition: [number, number, number]
  items: FurnitureLayoutItem[]
  edgeSnapThreshold: number
  bounds: LayoutBounds
}

interface ResolveRotatedFurnitureTransformOptions {
  rotatingId: string
  proposedRotationY: number
  items: FurnitureLayoutItem[]
  bounds: LayoutBounds
}

function getFootprint(item: FurnitureLayoutItem, position = item.position) {
  return {
    centerX: position[0],
    centerZ: position[2],
    rotationY: item.rotationY,
    size: item.footprintSize,
  }
}

function clampPositionToBounds(
  item: FurnitureLayoutItem,
  position: [number, number, number],
  bounds: LayoutBounds,
): [number, number, number] {
  const footprintBounds = getFootprintBounds(getFootprint(item, position))
  let nextX = position[0]
  let nextZ = position[2]

  if (footprintBounds.minX < bounds.minX) {
    nextX += bounds.minX - footprintBounds.minX
  }

  if (footprintBounds.maxX > bounds.maxX) {
    nextX -= footprintBounds.maxX - bounds.maxX
  }

  if (footprintBounds.minZ < bounds.minZ) {
    nextZ += bounds.minZ - footprintBounds.minZ
  }

  if (footprintBounds.maxZ > bounds.maxZ) {
    nextZ -= footprintBounds.maxZ - bounds.maxZ
  }

  return [nextX, position[1], nextZ]
}

function overlapsAnyOtherItem(
  movingId: string,
  movingFootprint: ReturnType<typeof getFootprint>,
  items: FurnitureLayoutItem[],
) {
  return items.some((item) => {
    if (item.id === movingId) {
      return false
    }

    return footprintsOverlap(movingFootprint, getFootprint(item))
  })
}

function getWallSnapPosition(
  item: FurnitureLayoutItem,
  position: [number, number, number],
  bounds: LayoutBounds,
  threshold: number,
): [number, number, number] | null {
  if (threshold <= 0) {
    return null
  }

  const footprintBounds = getFootprintBounds(getFootprint(item, position))
  let nextX = position[0]
  let nextZ = position[2]
  let hasSnap = false

  const minXGap = footprintBounds.minX - bounds.minX
  const maxXGap = bounds.maxX - footprintBounds.maxX
  const minZGap = footprintBounds.minZ - bounds.minZ
  const maxZGap = bounds.maxZ - footprintBounds.maxZ

  if (minXGap <= threshold || maxXGap <= threshold) {
    if (minXGap <= maxXGap) {
      nextX -= minXGap
    } else {
      nextX += maxXGap
    }

    hasSnap = true
  }

  if (minZGap <= threshold || maxZGap <= threshold) {
    if (minZGap <= maxZGap) {
      nextZ -= minZGap
    } else {
      nextZ += maxZGap
    }

    hasSnap = true
  }

  if (!hasSnap) {
    return null
  }

  return [nextX, position[1], nextZ]
}

export function resolveMovedFurniturePosition({
  movingId,
  proposedPosition,
  items,
  edgeSnapThreshold,
  bounds,
}: ResolveMovedFurniturePositionOptions): [number, number, number] | null {
  const movingItem = items.find((item) => item.id === movingId)

  if (!movingItem) {
    return null
  }

  const basePosition = clampPositionToBounds(
    movingItem,
    proposedPosition,
    bounds,
  )
  const baseFootprint = getFootprint(movingItem, basePosition)

  if (overlapsAnyOtherItem(movingId, baseFootprint, items)) {
    return null
  }

  let bestSnappedPosition: [number, number, number] | null = null
  let bestSnapDistance = Number.POSITIVE_INFINITY

  const wallSnapPosition = getWallSnapPosition(
    movingItem,
    basePosition,
    bounds,
    edgeSnapThreshold,
  )

  if (wallSnapPosition) {
    const wallSnapFootprint = getFootprint(movingItem, wallSnapPosition)

    if (!overlapsAnyOtherItem(movingId, wallSnapFootprint, items)) {
      bestSnappedPosition = wallSnapPosition
      bestSnapDistance = Math.hypot(
        wallSnapPosition[0] - basePosition[0],
        wallSnapPosition[2] - basePosition[2],
      )
    }
  }

  for (const item of items) {
    if (item.id === movingId) {
      continue
    }

    const snapDelta = getEdgeSnapDelta(
      baseFootprint,
      getFootprint(item),
      edgeSnapThreshold,
    )

    if (!snapDelta) {
      continue
    }

    const snappedPosition = clampPositionToBounds(
      movingItem,
      [
        basePosition[0] + snapDelta.x,
        basePosition[1],
        basePosition[2] + snapDelta.z,
      ],
      bounds,
    )
    const snappedFootprint = getFootprint(movingItem, snappedPosition)

    if (overlapsAnyOtherItem(movingId, snappedFootprint, items)) {
      continue
    }

    const snapDistance = Math.hypot(snapDelta.x, snapDelta.z)

    if (snapDistance < bestSnapDistance) {
      bestSnapDistance = snapDistance
      bestSnappedPosition = snappedPosition
    }
  }

  return bestSnappedPosition ?? basePosition
}

export function resolveRotatedFurnitureTransform({
  rotatingId,
  proposedRotationY,
  items,
  bounds,
}: ResolveRotatedFurnitureTransformOptions): {
  position: [number, number, number]
  rotationY: number
} | null {
  const rotatingItem = items.find((item) => item.id === rotatingId)

  if (!rotatingItem) {
    return null
  }

  const rotatedItem = {
    ...rotatingItem,
    rotationY: proposedRotationY,
  }
  const clampedPosition = clampPositionToBounds(
    rotatedItem,
    rotatingItem.position,
    bounds,
  )
  const rotatedFootprint = getFootprint(rotatedItem, clampedPosition)

  if (overlapsAnyOtherItem(rotatingId, rotatedFootprint, items)) {
    return null
  }

  return {
    position: clampedPosition,
    rotationY: proposedRotationY,
  }
}
