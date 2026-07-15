import type { LayoutBounds } from './furniture-layout'

export interface RoomSize {
  width: number
  depth: number
  height: number
}

export const DEFAULT_ROOM_SIZE: RoomSize = {
  width: 6,
  depth: 6,
  height: 2.5,
}

export const ROOM_SIZE_LIMITS = {
  width: { min: 2, max: 20 },
  depth: { min: 2, max: 20 },
  height: { min: 2, max: 5 },
} as const

export const FLOOR_PLANE_Y = 0
export const FURNITURE_SNAP_SIZE_METERS = 0.5
export const FURNITURE_EDGE_SNAP_THRESHOLD_METERS = 0.12

// The room is centered on the world origin: walls sit at +/- half extents.
export function getRoomLayoutBounds(
  size: Pick<RoomSize, 'width' | 'depth'>,
): LayoutBounds {
  return {
    minX: -size.width / 2,
    maxX: size.width / 2,
    minZ: -size.depth / 2,
    maxZ: size.depth / 2,
  }
}

function clampDimension(value: number, limits: { min: number; max: number }) {
  return Math.min(limits.max, Math.max(limits.min, value))
}

export function clampRoomSize(size: RoomSize): RoomSize {
  return {
    width: clampDimension(size.width, ROOM_SIZE_LIMITS.width),
    depth: clampDimension(size.depth, ROOM_SIZE_LIMITS.depth),
    height: clampDimension(size.height, ROOM_SIZE_LIMITS.height),
  }
}

export function isDefaultRoomSize(size: RoomSize): boolean {
  return (
    size.width === DEFAULT_ROOM_SIZE.width &&
    size.depth === DEFAULT_ROOM_SIZE.depth &&
    size.height === DEFAULT_ROOM_SIZE.height
  )
}

export function isRoomSizeWithinLimits(size: RoomSize): boolean {
  return (
    size.width >= ROOM_SIZE_LIMITS.width.min &&
    size.width <= ROOM_SIZE_LIMITS.width.max &&
    size.depth >= ROOM_SIZE_LIMITS.depth.min &&
    size.depth <= ROOM_SIZE_LIMITS.depth.max &&
    size.height >= ROOM_SIZE_LIMITS.height.min &&
    size.height <= ROOM_SIZE_LIMITS.height.max
  )
}
