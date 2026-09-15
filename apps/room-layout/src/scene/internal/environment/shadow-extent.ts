import type { RoomSize } from '@/domain/geometry/room-metrics'

/**
 * Grows the key light's shadow frustum with the room so shadows never clip
 * at the far walls; the 5.5/6 ratio reproduces the extent tuned for the
 * default 6x6 room.
 */
export function getShadowExtent(size: RoomSize): number {
  return Math.max(5.5, (5.5 / 6) * Math.max(size.width, size.depth))
}
