import type { CameraPreset } from '@/core/scene.types'
import type { RoomSize } from '@/domain/geometry/room-metrics'

interface PresetView {
  position: [number, number, number]
  target: [number, number, number]
}

// Derived from the room size; the ratios reproduce the views tuned for the
// default 6x6 room (corner [6,6,6], front [0,2,9], side [9,2,0], top y=10).
export function getCameraPresetViews(
  size: RoomSize,
): Record<CameraPreset, PresetView> {
  const maxDimension = Math.max(size.width, size.depth)

  return {
    corner: {
      position: [size.width, maxDimension, size.depth],
      target: [0, 0, 0],
    },
    front: {
      // Eye-height, centered, looking at the front face of the room.
      position: [0, 2, 1.5 * size.depth],
      target: [0, 1, 0],
    },
    side: {
      // Eye-height, centered, looking at the right side face of the room.
      position: [1.5 * size.width, 2, 0],
      target: [0, 1, 0],
    },
    top: {
      // Tiny Z offset prevents gimbal lock at straight-down angle.
      position: [0, Math.max(10, (5 / 3) * maxDimension), 0.001],
      target: [0, 0, 0],
    },
  }
}

// Far enough to frame the whole room from the corner preset (2x the longest
// side matches the 12 tuned for the 6x6 room), capped for the largest rooms.
export function getCameraMaxDistance(size: RoomSize): number {
  return Math.min(40, Math.max(8, 2 * Math.max(size.width, size.depth)))
}
