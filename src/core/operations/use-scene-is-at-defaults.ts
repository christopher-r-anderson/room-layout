import {
  resolveActiveFinishIds,
  type EnvironmentMaterialConfig,
} from '@/shared/lib/three/environment-materials'
import { isFreshSceneState } from '@/shared/lib/three/scene-defaults'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  assetsStore,
  useEnvironmentConfig,
} from '@/core/stores/assets-store'
import {
  sceneStateStore,
  useFloorFinishId,
  useItems,
  useWallFinishId,
} from '@/core/stores/scene-state-store'

function computeSceneIsAtDefaults(
  environmentConfig: EnvironmentMaterialConfig | null,
  items: FurnitureItem[],
  floorFinishId: string,
  wallFinishId: string,
): boolean {
  if (!environmentConfig) {
    return false
  }

  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    floorFinishId,
    wallFinishId,
  )

  return isFreshSceneState(
    {
      items,
      floorFinishId: activeFloorFinishId,
      wallFinishId: activeWallFinishId,
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

  return computeSceneIsAtDefaults(
    environmentConfig,
    items,
    floorFinishId,
    wallFinishId,
  )
}

// Non-reactive read for coordinators and dialog guards (e.g. the start-over
// `canOpen` gate) that need the current value outside React.
export function getSceneIsAtDefaults(): boolean {
  const { environmentConfig } = assetsStore.getState()
  const { history, floorFinishId, wallFinishId } = sceneStateStore.getState()

  return computeSceneIsAtDefaults(
    environmentConfig,
    history.present,
    floorFinishId,
    wallFinishId,
  )
}
