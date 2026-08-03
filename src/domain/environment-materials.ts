export interface FloorFinishOption {
  id: string
  label: string
  diffusePath: string
  normalPath: string
  previewPath?: string
  tileSizeMeters: {
    width: number
    depth: number
  }
}

export interface WallFinishOption {
  id: string
  label: string
  color: number
}

/**
 * A lighting mood retunes the existing room light rig (it adds no new lights);
 * exposure drives the renderer toneMappingExposure. Color fields are #RRGGBB
 * parsed to numbers (matching WallFinishOption.color); intensities are
 * non-negative.
 */
export interface LightingMoodOption {
  id: string
  label: string
  exposure: number
  ambientIntensity: number
  hemisphereSkyColor: number
  hemisphereGroundColor: number
  hemisphereIntensity: number
  keyLightColor: number
  keyLightIntensity: number
  fillLightColor: number
  fillLightIntensity: number
  environmentColor: number
  environmentIntensity: number
  backgroundIntensity: number
}

export interface EnvironmentMaterialConfig {
  floorFinishes: FloorFinishOption[]
  wallFinishes: WallFinishOption[]
  lightingMoods: LightingMoodOption[]
  defaultFloorFinishId: string
  defaultWallFinishId: string
  defaultLightingMoodId: string
}

export function resolveActiveFinishIds(
  config: EnvironmentMaterialConfig | null,
  floorFinishId: string,
  wallFinishId: string,
): { activeFloorFinishId: string; activeWallFinishId: string } {
  const activeFloorFinishId = config?.floorFinishes.some(
    (option) => option.id === floorFinishId,
  )
    ? floorFinishId
    : (config?.defaultFloorFinishId ?? '')

  const activeWallFinishId = config?.wallFinishes.some(
    (option) => option.id === wallFinishId,
  )
    ? wallFinishId
    : (config?.defaultWallFinishId ?? '')

  return { activeFloorFinishId, activeWallFinishId }
}

export function resolveActiveLightingMoodId(
  config: EnvironmentMaterialConfig | null,
  lightingMoodId: string,
): string {
  return config?.lightingMoods.some((option) => option.id === lightingMoodId)
    ? lightingMoodId
    : (config?.defaultLightingMoodId ?? '')
}

export function findFloorFinishOption(
  config: EnvironmentMaterialConfig,
  id: string,
): FloorFinishOption | null {
  return config.floorFinishes.find((option) => option.id === id) ?? null
}

export function findWallFinishOption(
  config: EnvironmentMaterialConfig,
  id: string,
): WallFinishOption | null {
  return config.wallFinishes.find((option) => option.id === id) ?? null
}

export function findLightingMoodOption(
  config: EnvironmentMaterialConfig,
  id: string,
): LightingMoodOption | null {
  return config.lightingMoods.find((option) => option.id === id) ?? null
}
