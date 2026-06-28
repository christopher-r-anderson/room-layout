import { useEffect } from 'react'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { editorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentStore } from '@/core/stores/scene-document-store'
import { clearSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import { isFreshSceneState } from '@/core/model/scene-defaults'

interface UseDraftPersistenceOptions {
  environmentConfig: EnvironmentMaterialConfig | null
}

interface DraftSceneState {
  items: ReturnType<typeof sceneDocumentStore.getState>['history']['present']
  isDragging: boolean
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
}

function areDraftSceneStatesEqual(
  left: DraftSceneState,
  right: DraftSceneState,
) {
  return (
    left.items === right.items &&
    left.isDragging === right.isDragging &&
    left.floorFinishId === right.floorFinishId &&
    left.wallFinishId === right.wallFinishId &&
    left.lightingMoodId === right.lightingMoodId
  )
}

function getDraftSceneState(): DraftSceneState {
  const sceneState = sceneDocumentStore.getState()

  return {
    items: sceneState.history.present,
    isDragging: sceneState.isDragging,
    floorFinishId: sceneState.floorFinishId,
    wallFinishId: sceneState.wallFinishId,
    lightingMoodId: sceneState.lightingMoodId,
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

  const activeLightingMoodId = environmentConfig.lightingMoods.some(
    (option) => option.id === sceneState.lightingMoodId,
  )
    ? sceneState.lightingMoodId
    : environmentConfig.defaultLightingMoodId

  return {
    activeFloorFinishId,
    activeWallFinishId,
    activeLightingMoodId,
  }
}

function persistDraft(environmentConfig: EnvironmentMaterialConfig) {
  const sceneState = getDraftSceneState()
  const startupPhase = editorLifecycleStore.getState().startupPhase

  if (startupPhase !== 'ready' || sceneState.isDragging) {
    return
  }

  const { activeFloorFinishId, activeWallFinishId, activeLightingMoodId } =
    getActiveFinishIds(sceneState, environmentConfig)

  if (
    isFreshSceneState(
      {
        items: sceneState.items,
        floorFinishId: activeFloorFinishId,
        wallFinishId: activeWallFinishId,
        lightingMoodId: activeLightingMoodId,
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
    lightingMoodId: activeLightingMoodId,
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

    const unsubscribeScene = sceneDocumentStore.subscribe(
      (state) => ({
        items: state.history.present,
        isDragging: state.isDragging,
        floorFinishId: state.floorFinishId,
        wallFinishId: state.wallFinishId,
        lightingMoodId: state.lightingMoodId,
      }),
      persist,
      { equalityFn: areDraftSceneStatesEqual },
    )

    const unsubscribeRuntime = editorLifecycleStore.subscribe(
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
