import { assetsStore } from '@/core/stores/assets-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { clearPreviewOnCanvasMiss } from '@/core/operations/preview-actions'
import { clearSceneDraft } from '@/core/persistence/scene-draft'
import { sceneCommands } from '@/scene/scene-commands'

/**
 * Resets the editor to the loaded environment's defaults: clears the layout,
 * preview, and persisted draft, restores default finishes and camera, and
 * suppresses the announce for the selection clear. Pure cross-cutting
 * coordination; feedback (announce/toast) is owned by the caller.
 */
export function resetSceneToDefaults() {
  const { environmentConfig } = assetsStore.getState()

  clearPreviewOnCanvasMiss()
  feedbackActions.clearStatusMessage()
  // Load-critical: clearing the room must happen. Reset only runs from a mounted
  // editor, so the scene is ready; the unguarded call lets a broken assumption
  // surface rather than silently leaving stale furniture in place.
  sceneCommands.restoreInitialLayout([])
  sceneDocumentActions.setFloorFinishId(
    environmentConfig?.defaultFloorFinishId ?? '',
  )
  sceneDocumentActions.setWallFinishId(
    environmentConfig?.defaultWallFinishId ?? '',
  )

  // Cosmetic: recentering the camera is best-effort, so it is fine to skip if
  // the scene is somehow not ready.
  if (sceneCommands.isSceneReady()) {
    sceneCommands.setCameraPreset('corner')
  }

  clearSceneDraft()
  selectionEffects.notePendingSelection({
    announceMode: 'suppress',
    requestOutlinerFocus: false,
  })
}
