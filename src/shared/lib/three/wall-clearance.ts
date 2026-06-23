import type { FurnitureItem } from '@/domain/furniture'
import { getFootprintBounds } from './furniture-footprint'
import type { LayoutBounds } from './furniture-layout'
import { ROOM_HALF_DEPTH_METERS, ROOM_HALF_WIDTH_METERS } from './room-metrics'

export interface WallClearances {
  left: number
  back: number
}

const DEFAULT_ROOM_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_WIDTH_METERS,
  maxX: ROOM_HALF_WIDTH_METERS,
  minZ: -ROOM_HALF_DEPTH_METERS,
  maxZ: ROOM_HALF_DEPTH_METERS,
}

function getItemFootprintBounds(item: FurnitureItem) {
  return getFootprintBounds({
    centerX: item.position[0],
    centerZ: item.position[2],
    rotationY: item.rotationY,
    size: item.footprintSize,
  })
}

export function getWallClearances(
  item: FurnitureItem,
  bounds: LayoutBounds = DEFAULT_ROOM_BOUNDS,
): WallClearances {
  const footprintBounds = getItemFootprintBounds(item)

  return {
    left: footprintBounds.minX - bounds.minX,
    back: footprintBounds.minZ - bounds.minZ,
  }
}

export function resolvePositionFromWallClearances(
  item: FurnitureItem,
  nextClearances: Partial<WallClearances>,
  bounds: LayoutBounds = DEFAULT_ROOM_BOUNDS,
): [number, number, number] {
  const footprintBounds = getItemFootprintBounds(item)
  const nextX =
    nextClearances.left === undefined
      ? item.position[0]
      : item.position[0] +
        (bounds.minX + nextClearances.left - footprintBounds.minX)
  const nextZ =
    nextClearances.back === undefined
      ? item.position[2]
      : item.position[2] +
        (bounds.minZ + nextClearances.back - footprintBounds.minZ)

  return [nextX, item.position[1], nextZ]
}
