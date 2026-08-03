import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import { useAssetsStore } from '@/core/stores/assets-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { clearPreviewOnCanvasMiss } from '@/core/operations/preview-actions'
import { clearSceneDraft } from '@/core/persistence/scene-draft'
import { sceneCommands } from '@/core/scene-commands'
import { restoreInitialLayout } from '@/core/operations/history-mutations'

/** Feedback (announce/toast) is owned by the caller. */
export function resetSceneToDefaults() {
  const { environmentConfig } = useAssetsStore.getState()

  clearPreviewOnCanvasMiss()
  // Load-critical: clearing the room must happen. Reset only runs from a mounted
  // editor, so the scene is ready; the unguarded call lets a broken assumption
  // surface rather than silently leaving stale furniture in place.
  restoreInitialLayout([])
  sceneDocumentActions.setFloorFinishId(
    environmentConfig?.defaultFloorFinishId ?? '',
  )
  sceneDocumentActions.setWallFinishId(
    environmentConfig?.defaultWallFinishId ?? '',
  )
  sceneDocumentActions.setLightingMoodId(
    environmentConfig?.defaultLightingMoodId ?? '',
  )
  sceneDocumentActions.setRoomSize(DEFAULT_ROOM_SIZE)

  // Cosmetic: recentering the camera is best-effort, so it is fine to skip if
  // the scene is somehow not ready.
  if (sceneCommands.isSceneReady()) {
    sceneCommands.setCameraPreset('corner')
  }

  clearSceneDraft()
}
