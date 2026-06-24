import { useMemo } from 'react'
import {
  findFloorFinishOption,
  findWallFinishOption,
  resolveActiveFinishIds,
  type EnvironmentMaterialConfig,
  type FloorFinishOption,
  type WallFinishOption,
} from '@/domain/environment-materials'
import { assetsStore, useEnvironmentConfig } from '@/core/stores/assets-store'
import {
  sceneDocumentStore,
  useFloorFinishId,
  useWallFinishId,
} from '@/core/stores/scene-document-store'

export interface ActiveFinishIds {
  activeFloorFinishId: string
  activeWallFinishId: string
  selectedFloorOption: FloorFinishOption | null
  selectedWallOption: WallFinishOption | null
}

function deriveActiveFinishIds(
  environmentConfig: EnvironmentMaterialConfig | null,
  floorFinishId: string,
  wallFinishId: string,
): ActiveFinishIds {
  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    floorFinishId,
    wallFinishId,
  )

  return {
    activeFloorFinishId,
    activeWallFinishId,
    selectedFloorOption: environmentConfig
      ? findFloorFinishOption(environmentConfig, activeFloorFinishId)
      : null,
    selectedWallOption: environmentConfig
      ? findWallFinishOption(environmentConfig, activeWallFinishId)
      : null,
  }
}

/**
 * The finish ids/options resolved against the loaded environment config: the
 * stored id when it is still valid, otherwise the config default. Derived purely
 * from `assets-store` (config) and `scene-document-store` (stored ids).
 */
export function useActiveFinishIds(): ActiveFinishIds {
  const environmentConfig = useEnvironmentConfig()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()

  return useMemo(
    () => deriveActiveFinishIds(environmentConfig, floorFinishId, wallFinishId),
    [environmentConfig, floorFinishId, wallFinishId],
  )
}

/** Non-reactive read of {@link useActiveFinishIds} for use outside React. */
export function getActiveFinishIds(): ActiveFinishIds {
  const { floorFinishId, wallFinishId } = sceneDocumentStore.getState()

  return deriveActiveFinishIds(
    assetsStore.getState().environmentConfig,
    floorFinishId,
    wallFinishId,
  )
}
