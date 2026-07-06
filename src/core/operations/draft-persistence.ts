import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import type { FurnitureItem } from '@/domain/furniture'
import { useAssetsStore } from '@/core/stores/assets-store'
import { useEditorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { clearSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import { isFreshSceneState } from '@/core/model/scene-defaults'
import { createReconciler } from './reconciler'

interface DraftSceneState {
  items: FurnitureItem[]
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
  const sceneState = useSceneDocumentStore.getState()

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

function persistDraft() {
  // The environment config lands in the assets store before startup can reach
  // 'ready', and the phase gate below holds until then - so a null config only
  // coincides with states that must not persist anyway.
  const environmentConfig = useAssetsStore.getState().environmentConfig
  const sceneState = getDraftSceneState()
  const startupPhase = useEditorLifecycleStore.getState().startupPhase

  if (!environmentConfig || startupPhase !== 'ready' || sceneState.isDragging) {
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

/**
 * Mirrors the scene document into the local draft whenever it changes while the
 * editor is ready and not dragging. Idempotent; returns an unsubscribe.
 */
export const startDraftPersistenceReconciler = createReconciler(() => {
  const unsubscribes = [
    useSceneDocumentStore.subscribe(
      (state): DraftSceneState => ({
        items: state.history.present,
        isDragging: state.isDragging,
        floorFinishId: state.floorFinishId,
        wallFinishId: state.wallFinishId,
        lightingMoodId: state.lightingMoodId,
      }),
      persistDraft,
      { equalityFn: areDraftSceneStatesEqual },
    ),
    useEditorLifecycleStore.subscribe(
      (state) => state.startupPhase,
      persistDraft,
    ),
  ]

  persistDraft()

  return unsubscribes
})
