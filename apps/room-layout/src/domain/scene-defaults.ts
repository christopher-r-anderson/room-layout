import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { DEFAULT_ROOM_SIZE, type RoomSize } from './geometry/room-metrics'
import {
  isSceneStateAtDefaults,
  type SceneComparableState,
} from './scene-model'

export interface DefaultSceneState extends SceneComparableState {
  items: []
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
  roomSize: RoomSize
}

export function createDefaultSceneState(options: {
  defaultFloorFinishId: string
  defaultWallFinishId: string
  defaultLightingMoodId: string
}): DefaultSceneState {
  return {
    items: [],
    floorFinishId: options.defaultFloorFinishId,
    wallFinishId: options.defaultWallFinishId,
    lightingMoodId: options.defaultLightingMoodId,
    roomSize: DEFAULT_ROOM_SIZE,
  }
}

function getDefaultSceneState(
  environmentConfig: EnvironmentMaterialConfig,
): DefaultSceneState {
  return createDefaultSceneState({
    defaultFloorFinishId: environmentConfig.defaultFloorFinishId,
    defaultWallFinishId: environmentConfig.defaultWallFinishId,
    defaultLightingMoodId: environmentConfig.defaultLightingMoodId,
  })
}

export function isFreshSceneState(
  state: SceneComparableState,
  environmentConfig: EnvironmentMaterialConfig,
) {
  return isSceneStateAtDefaults(state, getDefaultSceneState(environmentConfig))
}
