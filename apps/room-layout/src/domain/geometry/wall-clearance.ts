import type { FurnitureItem } from '@/domain/furniture'
import { getFootprintBounds } from './furniture-footprint'
import type { LayoutBounds } from './furniture-layout'

export interface WallClearances {
  left: number
  back: number
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
  bounds: LayoutBounds,
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
  bounds: LayoutBounds,
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
