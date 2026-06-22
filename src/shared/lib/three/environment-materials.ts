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

export interface EnvironmentMaterialConfig {
  floorFinishes: FloorFinishOption[]
  wallFinishes: WallFinishOption[]
  defaultFloorFinishId: string
  defaultWallFinishId: string
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
