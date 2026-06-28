import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import {
  isSceneStateAtDefaults,
  type SceneComparableState,
} from './scene-model'

export interface DefaultSceneState extends SceneComparableState {
  items: []
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
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
