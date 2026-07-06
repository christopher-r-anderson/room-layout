import {
  resolveActiveFinishIds,
  resolveActiveLightingMoodId,
  type EnvironmentMaterialConfig,
} from '@/domain/environment-materials'
import { isFreshSceneState } from '@/core/model/scene-defaults'
import type { FurnitureItem } from '@/domain/furniture'
import {
  useAssetsStore,
  useEnvironmentConfig,
} from '@/core/stores/assets-store'
import {
  useSceneDocumentStore,
  useFloorFinishId,
  useItems,
  useLightingMoodId,
  useWallFinishId,
} from '@/core/stores/scene-document-store'

function computeSceneIsAtDefaults(
  environmentConfig: EnvironmentMaterialConfig | null,
  items: FurnitureItem[],
  floorFinishId: string,
  wallFinishId: string,
  lightingMoodId: string,
): boolean {
  if (!environmentConfig) {
    return false
  }

  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    floorFinishId,
    wallFinishId,
  )
  const activeLightingMoodId = resolveActiveLightingMoodId(
    environmentConfig,
    lightingMoodId,
  )

  return isFreshSceneState(
    {
      items,
      floorFinishId: activeFloorFinishId,
      wallFinishId: activeWallFinishId,
      lightingMoodId: activeLightingMoodId,
    },
    environmentConfig,
  )
}

/**
 * Whether the scene matches the loaded environment's defaults (no furniture, no
 * finish changes). Drives start-over availability. Derives from the scene-assets
 * environment + the scene-state read model so consumers self-source it instead of
 * receiving a threaded `startOverDisabled`/`sceneIsAtDefaults` prop.
 */
export function useSceneIsAtDefaults(): boolean {
  const environmentConfig = useEnvironmentConfig()
  const items = useItems()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const lightingMoodId = useLightingMoodId()

  return computeSceneIsAtDefaults(
    environmentConfig,
    items,
    floorFinishId,
    wallFinishId,
    lightingMoodId,
  )
}

// Non-reactive read for coordinators and dialog guards (e.g. the start-over
// `canOpen` gate) that need the current value outside React.
export function getSceneIsAtDefaults(): boolean {
  const { environmentConfig } = useAssetsStore.getState()
  const { history, floorFinishId, wallFinishId, lightingMoodId } =
    useSceneDocumentStore.getState()

  return computeSceneIsAtDefaults(
    environmentConfig,
    history.present,
    floorFinishId,
    wallFinishId,
    lightingMoodId,
  )
}
