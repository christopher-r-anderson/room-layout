import type {
  EnvironmentMaterialConfig,
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'

function createFloorOptions(): FloorFinishOption[] {
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

function createWallOptions(): WallFinishOption[] {
  return [
    { id: 'light-gray', label: 'Light Gray', color: 0xf5f5f5 },
    { id: 'warm-white', label: 'Warm White', color: 0xf7f3ea },
  ]
}

export function createEnvironmentConfig(): EnvironmentMaterialConfig {
  return {
    floorFinishes: createFloorOptions(),
    wallFinishes: createWallOptions(),
    lightingMoods: createLightingMoodOptions(),
    defaultFloorFinishId: 'wood-floor',
    defaultWallFinishId: 'light-gray',
    defaultLightingMoodId: 'daylight',
  }
}

function createLightingMoodOptions(): LightingMoodOption[] {
  return [
    {
      id: 'daylight',
      label: 'Daylight',
      exposure: 1.05,
      ambientIntensity: 0.35,
      hemisphereSkyColor: 0xf1f6ff,
      hemisphereGroundColor: 0xaeb9c9,
      hemisphereIntensity: 0.55,
      keyLightColor: 0xfff4e6,
      keyLightIntensity: 1,
      fillLightColor: 0xd5e4ff,
      fillLightIntensity: 0.28,
      environmentColor: 0xdce6f3,
      environmentIntensity: 0.72,
      backgroundIntensity: 0.95,
    },
    {
      id: 'soft-lamplight',
      label: 'Soft Lamplight',
      exposure: 0.85,
      ambientIntensity: 0.22,
      hemisphereSkyColor: 0xffe6c4,
      hemisphereGroundColor: 0xb59a78,
      hemisphereIntensity: 0.38,
      keyLightColor: 0xffdca0,
      keyLightIntensity: 0.8,
      fillLightColor: 0xffcf95,
      fillLightIntensity: 0.2,
      environmentColor: 0xe9d3b8,
      environmentIntensity: 0.55,
      backgroundIntensity: 0.78,
    },
  ]
}
