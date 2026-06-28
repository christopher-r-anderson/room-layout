import { useMemo } from 'react'
import {
  findFloorFinishOption,
  findLightingMoodOption,
  findWallFinishOption,
  resolveActiveFinishIds,
  resolveActiveLightingMoodId,
  type EnvironmentMaterialConfig,
  type FloorFinishOption,
  type LightingMoodOption,
  type WallFinishOption,
} from '@/domain/environment-materials'
import { assetsStore, useEnvironmentConfig } from '@/core/stores/assets-store'
import {
  sceneDocumentStore,
  useFloorFinishId,
  useLightingMoodId,
  useWallFinishId,
} from '@/core/stores/scene-document-store'

export interface ActiveFinishIds {
  activeFloorFinishId: string
  activeWallFinishId: string
  activeLightingMoodId: string
  selectedFloorOption: FloorFinishOption | null
  selectedWallOption: WallFinishOption | null
  selectedLightingMoodOption: LightingMoodOption | null
}

function deriveActiveFinishIds(
  environmentConfig: EnvironmentMaterialConfig | null,
  floorFinishId: string,
  wallFinishId: string,
  lightingMoodId: string,
): ActiveFinishIds {
  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    floorFinishId,
    wallFinishId,
  )
  const activeLightingMoodId = resolveActiveLightingMoodId(
    environmentConfig,
    lightingMoodId,
  )

  return {
    activeFloorFinishId,
    activeWallFinishId,
    activeLightingMoodId,
    selectedFloorOption: environmentConfig
      ? findFloorFinishOption(environmentConfig, activeFloorFinishId)
      : null,
    selectedWallOption: environmentConfig
      ? findWallFinishOption(environmentConfig, activeWallFinishId)
      : null,
    selectedLightingMoodOption: environmentConfig
      ? findLightingMoodOption(environmentConfig, activeLightingMoodId)
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
  const lightingMoodId = useLightingMoodId()

  return useMemo(
    () =>
      deriveActiveFinishIds(
        environmentConfig,
        floorFinishId,
        wallFinishId,
        lightingMoodId,
      ),
    [environmentConfig, floorFinishId, wallFinishId, lightingMoodId],
  )
}

/** Non-reactive read of {@link useActiveFinishIds} for use outside React. */
export function getActiveFinishIds(): ActiveFinishIds {
  const { floorFinishId, wallFinishId, lightingMoodId } =
    sceneDocumentStore.getState()

  return deriveActiveFinishIds(
    assetsStore.getState().environmentConfig,
    floorFinishId,
    wallFinishId,
    lightingMoodId,
  )
}
