import type { RefObject } from 'react'
import type { SceneRef } from '@/scene/scene.types'

export function runStartupReset(options: {
  resetOverlayState: () => void
  sceneRef: RefObject<SceneRef | null>
}) {
  options.resetOverlayState()
  options.sceneRef.current = null
}
