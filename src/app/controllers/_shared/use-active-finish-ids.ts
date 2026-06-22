import { useMemo } from 'react'
import {
  findFloorFinishOption,
  findWallFinishOption,
  resolveActiveFinishIds,
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
  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    floorFinishId,
    wallFinishId,
  )

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
