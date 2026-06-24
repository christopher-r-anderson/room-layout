import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { CameraPreset } from '@/scene/scene.types'

/**
 * Editor-level wrappers around the scene's imperative view commands. They gate
 * on editor-interactivity and scene readiness so callers (keyboard/toolbar
 * dispatch) do not have to repeat the guard or risk throwing before the scene
 * mounts.
 */

export function setCameraPreset(preset: CameraPreset) {
  if (!isEditorInteractive() || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.setCameraPreset(preset)
}

export function focusSelectedInView() {
  if (!isEditorInteractive() || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.focusSelected()
}
