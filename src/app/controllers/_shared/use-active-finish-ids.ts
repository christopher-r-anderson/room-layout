import { useMemo } from 'react'
import {
  findFloorFinishOption,
  findWallFinishOption,
  type EnvironmentMaterialConfig,
  type FloorFinishOption,
  type WallFinishOption,
} from '@/shared/lib/three/environment-materials'

interface UseActiveFinishIdsOptions {
  environmentConfig: EnvironmentMaterialConfig | null
  floorFinishId: string
  wallFinishId: string
}

interface ActiveFinishIds {
  activeFloorFinishId: string
  activeWallFinishId: string
  selectedFloorOption: FloorFinishOption | null
  selectedWallOption: WallFinishOption | null
}

export function useActiveFinishIds({
  environmentConfig,
  floorFinishId,
  wallFinishId,
}: UseActiveFinishIdsOptions): ActiveFinishIds {
  const activeFloorFinishId = environmentConfig?.floorFinishes.some(
    (option) => option.id === floorFinishId,
  )
    ? floorFinishId
    : (environmentConfig?.defaultFloorFinishId ?? '')

  const activeWallFinishId = environmentConfig?.wallFinishes.some(
    (option) => option.id === wallFinishId,
  )
    ? wallFinishId
    : (environmentConfig?.defaultWallFinishId ?? '')

  const selectedFloorOption = useMemo(
    () =>
      environmentConfig
        ? findFloorFinishOption(environmentConfig, activeFloorFinishId)
        : null,
    [environmentConfig, activeFloorFinishId],
  )

  const selectedWallOption = useMemo(
    () =>
      environmentConfig
        ? findWallFinishOption(environmentConfig, activeWallFinishId)
        : null,
    [environmentConfig, activeWallFinishId],
  )

  return {
    activeFloorFinishId,
    activeWallFinishId,
    selectedFloorOption,
    selectedWallOption,
  }
}
