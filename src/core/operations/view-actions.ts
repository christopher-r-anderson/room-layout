import { sceneCommands } from '@/scene/scene-commands'
import type { CameraPreset } from '@/scene/scene.types'

/**
 * Editor-level wrappers around the scene's imperative view commands. They gate
 * on scene readiness so callers (keyboard/toolbar dispatch) do not have to
 * repeat the guard or risk throwing before the scene mounts.
 */

export function setCameraPreset(preset: CameraPreset) {
  if (!sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.setCameraPreset(preset)
}

export function focusSelectedInView() {
  if (!sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.focusSelected()
}
