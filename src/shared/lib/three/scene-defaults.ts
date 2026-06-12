import type { EnvironmentMaterialConfig } from './environment-materials'
import {
  isSceneStateAtDefaults,
  type SceneComparableState,
} from './scene-model'

export interface DefaultSceneState extends SceneComparableState {
  items: []
  floorFinishId: string
  wallFinishId: string
}

export function createDefaultSceneState(options: {
  defaultFloorFinishId: string
  defaultWallFinishId: string
}): DefaultSceneState {
  return {
    items: [],
    floorFinishId: options.defaultFloorFinishId,
    wallFinishId: options.defaultWallFinishId,
  }
}

function getDefaultSceneState(
  environmentConfig: EnvironmentMaterialConfig,
): DefaultSceneState {
  return createDefaultSceneState({
    defaultFloorFinishId: environmentConfig.defaultFloorFinishId,
    defaultWallFinishId: environmentConfig.defaultWallFinishId,
  })
}

export function isFreshSceneState(
  state: SceneComparableState,
  environmentConfig: EnvironmentMaterialConfig,
) {
  return isSceneStateAtDefaults(state, getDefaultSceneState(environmentConfig))
}
