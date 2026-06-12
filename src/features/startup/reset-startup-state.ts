import { clearSceneServices } from '@/scene/scene-commands'

export function runStartupReset(options: { resetOverlayState: () => void }) {
  options.resetOverlayState()
  clearSceneServices()
}
