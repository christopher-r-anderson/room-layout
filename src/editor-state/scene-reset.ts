import { sceneAssetsStore } from '@/editor-state/scene-assets-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { selectionEffects } from '@/editor-state/selection-effects'
import { clearPreviewOnCanvasMiss } from '@/editor-state/preview-actions'
import { clearSceneDraft } from '@/editor-state/scene-draft'
import { sceneCommands } from '@/scene/scene-commands'

/**
 * Resets the editor to the loaded environment's defaults: clears the layout,
 * preview, and persisted draft, restores default finishes and camera, and
 * suppresses the announce for the selection clear. Pure cross-cutting
 * coordination; feedback (announce/toast) is owned by the caller.
 */
export function resetSceneToDefaults() {
  const { environmentConfig } = sceneAssetsStore.getState()

  clearPreviewOnCanvasMiss()
  sceneStateActions.clearEditorMessage()
  sceneCommands.restoreInitialLayout([])
  sceneStateActions.setFloorFinishId(
    environmentConfig?.defaultFloorFinishId ?? '',
  )
  sceneStateActions.setWallFinishId(
    environmentConfig?.defaultWallFinishId ?? '',
  )

  if (sceneCommands.isSceneReady()) {
    sceneCommands.setCameraPreset('corner')
  }

  clearSceneDraft()
  selectionEffects.notePendingSelection({
    announceMode: 'suppress',
    requestOutlinerFocus: false,
  })
}
