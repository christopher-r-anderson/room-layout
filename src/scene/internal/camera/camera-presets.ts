import type { CameraPreset } from '@/core/scene.types'

interface PresetView {
  position: [number, number, number]
  target: [number, number, number]
}

// Tuned for a 6×6 room (ROOM_HALF_SIZE = 3).
export const CAMERA_PRESETS: Record<CameraPreset, PresetView> = {
  corner: {
    position: [6, 6, 6],
    target: [0, 0, 0],
  },
  front: {
    // Eye-height, centered, looking at the front face of the room.
    position: [0, 2, 9],
    target: [0, 1, 0],
  },
  side: {
    // Eye-height, centered, looking at the right side face of the room.
    position: [9, 2, 0],
    target: [0, 1, 0],
  },
  top: {
    // Tiny Z offset prevents gimbal lock at straight-down angle.
    position: [0, 10, 0.001],
    target: [0, 0, 0],
  },
}
