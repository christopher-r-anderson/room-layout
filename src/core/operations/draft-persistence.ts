import { shallow } from 'zustand/shallow'
import {
  resolveActiveFinishIds,
  resolveActiveLightingMoodId,
} from '@/domain/environment-materials'
import type { FurnitureItem } from '@/domain/furniture'
import type { RoomSize } from '@/domain/geometry/room-metrics'
import { useAssetsStore } from '@/core/stores/assets-store'
import { useEditorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'
import { clearSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import { getSceneIsAtDefaults } from './use-scene-is-at-defaults'
import { createReconciler } from './reconciler'

interface DraftSceneState {
  items: FurnitureItem[]
  floorFinishId: string
  wallFinishId: string
  lightingMoodId: string
  roomSize: RoomSize
}

function selectDraftSceneState(
  state: ReturnType<typeof useSceneDocumentStore.getState>,
): DraftSceneState {
  return {
    items: state.history.present,
    floorFinishId: state.floorFinishId,
    wallFinishId: state.wallFinishId,
    lightingMoodId: state.lightingMoodId,
    roomSize: state.roomSize,
  }
}

function persistDraft() {
  const environmentConfig = useAssetsStore.getState().environmentConfig
  const sceneState = selectDraftSceneState(useSceneDocumentStore.getState())
  const startupPhase = useEditorLifecycleStore.getState().startupPhase
  const isDragging = useSceneSessionStore.getState().isDragging

  if (!environmentConfig || startupPhase !== 'ready' || isDragging) {
    return
  }

  if (getSceneIsAtDefaults()) {
    clearSceneDraft()
    return
  }

  const { activeFloorFinishId, activeWallFinishId } = resolveActiveFinishIds(
    environmentConfig,
    sceneState.floorFinishId,
    sceneState.wallFinishId,
  )
  const activeLightingMoodId = resolveActiveLightingMoodId(
    environmentConfig,
    sceneState.lightingMoodId,
  )

  saveSceneDraft(sceneState.items, {
    floorFinishId: activeFloorFinishId,
    wallFinishId: activeWallFinishId,
    lightingMoodId: activeLightingMoodId,
    roomSize: sceneState.roomSize,
  })
}

/**
 * Mirrors the scene document into the local draft whenever it changes while the
 * editor is ready and not dragging. Idempotent; returns an unsubscribe.
 */
export const startDraftPersistenceReconciler = createReconciler(() => {
  const unsubscribes = [
    useSceneDocumentStore.subscribe(selectDraftSceneState, persistDraft, {
      equalityFn: shallow,
    }),
    // Dragging suppresses persistence while the document coalesces per-move
    // writes; the drag-end flip persists the final position.
    useSceneSessionStore.subscribe((state) => state.isDragging, persistDraft),
    useEditorLifecycleStore.subscribe(
      (state) => state.startupPhase,
      persistDraft,
    ),
    // The assets store only writes when the manifest lands, so this keeps the
    // persist gate self-sufficient instead of depending on the environment
    // config always preceding the 'ready' phase.
    useAssetsStore.subscribe(persistDraft),
  ]

  persistDraft()

  return unsubscribes
})
