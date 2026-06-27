import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/domain/environment-materials'

export function createFloorOptions(): FloorFinishOption[] {
  return [
    {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/textures/wood.jpg',
      normalPath: '/textures/wood-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
    {
      id: 'concrete-floor',
      label: 'Concrete',
      diffusePath: '/textures/concrete.jpg',
      normalPath: '/textures/concrete-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
  ]
}

export function createWallOptions(): WallFinishOption[] {
  return [
    { id: 'light-gray', label: 'Light Gray', color: 0xf5f5f5 },
    { id: 'warm-white', label: 'Warm White', color: 0xf7f3ea },
  ]
}
