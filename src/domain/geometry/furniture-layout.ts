import type { FootprintSize } from '@/domain/furniture'
import {
  footprintsOverlap,
  getEdgeSnapDelta,
  getFootprintBounds,
} from './furniture-footprint'

interface FurnitureLayoutItem {
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

interface ResolveAbsoluteFurnitureTransformOptions {
  movingId: string
  proposedPosition: [number, number, number]
  proposedRotationY: number
  items: FurnitureLayoutItem[]
  bounds: LayoutBounds
}

export type ResolveAbsoluteFurnitureTransformResult =
  | {
      ok: true
      position: [number, number, number]
      rotationY: number
    }
  | {
      ok: false
      reason: 'blocked-bounds' | 'blocked-collision'
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

// Serialized positions and rotations are rounded to 3 decimals, so a
// wall-flush item can re-load with its footprint slightly past the wall:
// up to 0.5 mm from the position alone, and more once the rounded rotation
// shifts the projected footprint corners. 2 mm absorbs that combined error
// while still catching any real excursion.
const OUT_OF_BOUNDS_TOLERANCE_METERS = 0.002

function isFootprintOutOfBounds(
  item: FurnitureLayoutItem,
  bounds: LayoutBounds,
) {
  const footprintBounds = getFootprintBounds(getFootprint(item))

  return (
    footprintBounds.minX < bounds.minX - OUT_OF_BOUNDS_TOLERANCE_METERS ||
    footprintBounds.maxX > bounds.maxX + OUT_OF_BOUNDS_TOLERANCE_METERS ||
    footprintBounds.minZ < bounds.minZ - OUT_OF_BOUNDS_TOLERANCE_METERS ||
    footprintBounds.maxZ > bounds.maxZ + OUT_OF_BOUNDS_TOLERANCE_METERS
  )
}

export function getOutOfBoundsItemIds(
  items: readonly FurnitureLayoutItem[],
  bounds: LayoutBounds,
): string[] {
  return items
    .filter((item) => isFootprintOutOfBounds(item, bounds))
    .map((item) => item.id)
}

// Like clampPositionToBounds, but a footprint larger than the room gets
// centered on the exceeded axis instead of favoring whichever edge the
// original position happened to violate.
function pullPositionInsideBounds(
  item: FurnitureLayoutItem,
  bounds: LayoutBounds,
): [number, number, number] {
  const footprintBounds = getFootprintBounds(getFootprint(item))
  const clamped = clampPositionToBounds(item, item.position, bounds)
  const next: [number, number, number] = [...clamped]

  if (footprintBounds.maxX - footprintBounds.minX > bounds.maxX - bounds.minX) {
    next[0] =
      item.position[0] +
      (bounds.minX + bounds.maxX) / 2 -
      (footprintBounds.minX + footprintBounds.maxX) / 2
  }

  if (footprintBounds.maxZ - footprintBounds.minZ > bounds.maxZ - bounds.minZ) {
    next[2] =
      item.position[2] +
      (bounds.minZ + bounds.maxZ) / 2 -
      (footprintBounds.minZ + footprintBounds.maxZ) / 2
  }

  return next
}

/**
 * Pulls every out-of-bounds item back inside `bounds`; a footprint larger
 * than the room ends up centered on the exceeded axis. Returns the input
 * array identity when nothing moved, so history commits can no-op on it.
 */
export function clampItemsToLayoutBounds<T extends FurnitureLayoutItem>(
  items: T[],
  bounds: LayoutBounds,
): { items: T[]; movedCount: number } {
  let movedCount = 0
  const nextItems = items.map((item) => {
    if (!isFootprintOutOfBounds(item, bounds)) {
      return item
    }

    movedCount += 1

    return {
      ...item,
      position: pullPositionInsideBounds(item, bounds),
    }
  })

  return movedCount === 0
    ? { items, movedCount }
    : { items: nextItems, movedCount }
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

export function resolveAbsoluteFurnitureTransform({
  movingId,
  proposedPosition,
  proposedRotationY,
  items,
  bounds,
}: ResolveAbsoluteFurnitureTransformOptions): ResolveAbsoluteFurnitureTransformResult | null {
  const movingItem = items.find((item) => item.id === movingId)

  if (!movingItem) {
    return null
  }

  const proposedItem = {
    ...movingItem,
    position: proposedPosition,
    rotationY: proposedRotationY,
  }

  const clampedPosition = clampPositionToBounds(
    proposedItem,
    proposedPosition,
    bounds,
  )

  if (
    clampedPosition[0] !== proposedPosition[0] ||
    clampedPosition[1] !== proposedPosition[1] ||
    clampedPosition[2] !== proposedPosition[2]
  ) {
    return {
      ok: false,
      reason: 'blocked-bounds',
    }
  }

  const proposedFootprint = getFootprint(proposedItem, proposedPosition)

  if (overlapsAnyOtherItem(movingId, proposedFootprint, items)) {
    return {
      ok: false,
      reason: 'blocked-collision',
    }
  }

  return {
    ok: true,
    position: proposedPosition,
    rotationY: proposedRotationY,
  }
}
