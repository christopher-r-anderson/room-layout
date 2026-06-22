import { resolveActiveFinishIds } from '@/shared/lib/three/environment-materials'
import { isFreshSceneState } from '@/shared/lib/three/scene-defaults'
import { useEnvironmentConfig } from '@/editor-state/scene-assets-store'
import {
  useFloorFinishId,
  useItems,
  useWallFinishId,
} from '@/editor-state/scene-state-store'

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
