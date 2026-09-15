import type { CameraPreset } from '@/core/scene.types'
import type { RoomSize } from '@/domain/geometry/room-metrics'

interface PresetView {
  position: [number, number, number]
  target: [number, number, number]
}

// The distance the "frame the whole room" views must respect: the larger
// floor side, or twice the wall height so tall narrow rooms stay in frame.
function getRoomFramingDimension(size: RoomSize) {
  return Math.max(size.width, size.depth, 2 * size.height)
}

// Distance for the eye-height front/side views: far enough for the viewed
// span (1.5x the facing axis, wide rooms scale with the cross span) and for
// the wall height - with the target at y=1 and the 50-degree vertical FOV,
// framing up to `height` needs ~2.2x (height - 1).
function getEyeLevelViewDistance(size: RoomSize, axis: number, span: number) {
  return Math.max(1.5 * Math.max(axis, 0.75 * span), 2.2 * (size.height - 1))
}

/**
 * Derived from the room size; the ratios reproduce the views tuned for the
 * default 6x6 room (corner [6,6,6], front [0,2,9], side [9,2,0], top y=10).
 */
export function getCameraPresetViews(
  size: RoomSize,
): Record<CameraPreset, PresetView> {
  const framingDimension = getRoomFramingDimension(size)

  return {
    corner: {
      position: [size.width, framingDimension, size.depth],
      target: [0, 0, 0],
    },
    front: {
      position: [0, 2, getEyeLevelViewDistance(size, size.depth, size.width)],
      target: [0, 1, 0],
    },
    side: {
      position: [getEyeLevelViewDistance(size, size.width, size.depth), 2, 0],
      target: [0, 1, 0],
    },
    top: {
      // Tiny Z offset prevents gimbal lock at straight-down angle.
      position: [0, Math.max(10, (5 / 3) * framingDimension), 0.001],
      target: [0, 0, 0],
    },
  }
}

/**
 * Far enough to reach every preset (2x the framing dimension matches the 12
 * tuned for the 6x6 room), capped for the largest rooms.
 */
export function getCameraMaxDistance(size: RoomSize): number {
  return Math.min(40, Math.max(8, 2 * getRoomFramingDimension(size)))
}
