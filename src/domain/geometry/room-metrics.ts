import type { LayoutBounds } from './furniture-layout'

export const ROOM_FLOOR_WIDTH_METERS = 6
export const ROOM_FLOOR_DEPTH_METERS = 6
export const ROOM_WALL_HEIGHT_METERS = 2.5

export const ROOM_HALF_WIDTH_METERS = ROOM_FLOOR_WIDTH_METERS / 2
export const ROOM_HALF_DEPTH_METERS = ROOM_FLOOR_DEPTH_METERS / 2

export const FLOOR_PLANE_Y = 0
export const FURNITURE_SNAP_SIZE_METERS = 0.5
export const FURNITURE_EDGE_SNAP_THRESHOLD_METERS = 0.12

export const ROOM_LAYOUT_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_WIDTH_METERS,
  maxX: ROOM_HALF_WIDTH_METERS,
  minZ: -ROOM_HALF_DEPTH_METERS,
  maxZ: ROOM_HALF_DEPTH_METERS,
}
