import {
  resolveActiveFinishIds,
  resolveActiveLightingMoodId,
  type EnvironmentMaterialConfig,
} from '@/domain/environment-materials'
import { isFreshSceneState } from '@/domain/scene-defaults'
import type { FurnitureItem } from '@/domain/furniture'
import type { RoomSize } from '@/domain/geometry/room-metrics'
import {
  useAssetsStore,
  useEnvironmentConfig,
} from '@/core/stores/assets-store'
import {
  useSceneDocumentStore,
  useFloorFinishId,
  useItems,
  useLightingMoodId,
  useRoomSize,
  useWallFinishId,
} from '@/core/stores/scene-document-store'

function computeSceneIsAtDefaults(
  environmentConfig: EnvironmentMaterialConfig | null,
  items: FurnitureItem[],
  floorFinishId: string,
  wallFinishId: string,
  lightingMoodId: string,
  roomSize: RoomSize,
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
      roomSize,
    },
    environmentConfig,
  )
}

/**
 * Whether the scene matches the loaded environment's defaults (no furniture,
 * no finish changes). Drives start-over availability.
 */
export function useSceneIsAtDefaults(): boolean {
  const environmentConfig = useEnvironmentConfig()
  const items = useItems()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const lightingMoodId = useLightingMoodId()
  const roomSize = useRoomSize()

  return computeSceneIsAtDefaults(
    environmentConfig,
    items,
    floorFinishId,
    wallFinishId,
    lightingMoodId,
    roomSize,
  )
}

/**
 * Non-reactive read for coordinators and dialog guards (e.g. the start-over
 * `canOpen` gate) that need the current value outside React.
 */
export function getSceneIsAtDefaults(): boolean {
  const { environmentConfig } = useAssetsStore.getState()
  const { history, floorFinishId, wallFinishId, lightingMoodId, roomSize } =
    useSceneDocumentStore.getState()

  return computeSceneIsAtDefaults(
    environmentConfig,
    history.present,
    floorFinishId,
    wallFinishId,
    lightingMoodId,
    roomSize,
  )
}
