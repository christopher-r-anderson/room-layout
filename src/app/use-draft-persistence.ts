import { useEffect } from 'react'
import type { EnvironmentMaterialConfig } from '@/lib/three/environment-materials'
import { editorRuntimeStore } from '@/editor-state/editor-runtime-store'
import { sceneStateStore } from '@/editor-state/scene-state-store'
import { clearSceneDraft, saveSceneDraft } from './url-scene/scene-draft'
import { isFreshSceneState } from './startup/scene-defaults'

interface UseDraftPersistenceOptions {
  environmentConfig: EnvironmentMaterialConfig | null
}

interface DraftSceneState {
  items: ReturnType<typeof sceneStateStore.getState>['history']['present']
  isDragging: boolean
  floorFinishId: string
  wallFinishId: string
}

function areDraftSceneStatesEqual(
  left: DraftSceneState,
  right: DraftSceneState,
) {
  return (
    left.items === right.items &&
    left.isDragging === right.isDragging &&
    left.floorFinishId === right.floorFinishId &&
    left.wallFinishId === right.wallFinishId
  )
}

function getDraftSceneState(): DraftSceneState {
  const sceneState = sceneStateStore.getState()

  return {
    items: sceneState.history.present,
    isDragging: sceneState.isDragging,
    floorFinishId: sceneState.floorFinishId,
    wallFinishId: sceneState.wallFinishId,
  }
}

function getActiveFinishIds(
  sceneState: DraftSceneState,
  environmentConfig: EnvironmentMaterialConfig,
) {
  const activeFloorFinishId = environmentConfig.floorFinishes.some(
    (option) => option.id === sceneState.floorFinishId,
  )
    ? sceneState.floorFinishId
    : environmentConfig.defaultFloorFinishId

  const activeWallFinishId = environmentConfig.wallFinishes.some(
    (option) => option.id === sceneState.wallFinishId,
  )
    ? sceneState.wallFinishId
    : environmentConfig.defaultWallFinishId

  return {
    activeFloorFinishId,
    activeWallFinishId,
  }
}

function persistDraft(environmentConfig: EnvironmentMaterialConfig) {
  const sceneState = getDraftSceneState()
  const startupPhase = editorRuntimeStore.getState().startupPhase

  if (startupPhase !== 'ready' || sceneState.isDragging) {
    return
  }

  const { activeFloorFinishId, activeWallFinishId } = getActiveFinishIds(
    sceneState,
    environmentConfig,
  )

  if (
    isFreshSceneState(
      {
        items: sceneState.items,
        floorFinishId: activeFloorFinishId,
        wallFinishId: activeWallFinishId,
      },
      environmentConfig,
    )
  ) {
    clearSceneDraft()
    return
  }

  saveSceneDraft(sceneState.items, {
    floorFinishId: activeFloorFinishId,
    wallFinishId: activeWallFinishId,
  })
}

export function useDraftPersistence({
  environmentConfig,
}: UseDraftPersistenceOptions) {
  useEffect(() => {
    if (!environmentConfig) {
      return
    }

    const persist = () => {
      persistDraft(environmentConfig)
    }

    const unsubscribeScene = sceneStateStore.subscribe(
      (state) => ({
        items: state.history.present,
        isDragging: state.isDragging,
        floorFinishId: state.floorFinishId,
        wallFinishId: state.wallFinishId,
      }),
      persist,
      { equalityFn: areDraftSceneStatesEqual },
    )

    const unsubscribeRuntime = editorRuntimeStore.subscribe(
      (state) => state.startupPhase,
      persist,
    )

    persist()

    return () => {
      unsubscribeScene()
      unsubscribeRuntime()
    }
  }, [environmentConfig])
}
