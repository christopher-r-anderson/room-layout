import type { ReactElement } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'

/**
 * Camera defaults avoid undefined projection values in jsdom tests; the stub
 * renderer comes from @react-three/test-renderer (no WebGL needed).
 */
export async function createR3FTestScene(
  element: ReactElement,
  options?: Parameters<typeof ReactThreeTestRenderer.create>[1],
) {
  const defaultOptions = {
    width: 800,
    height: 600,
    camera: {
      position: [0, 0, 10] as [number, number, number],
      fov: 75,
      near: 0.1,
      far: 1000,
    },
    ...options,
  }

  return ReactThreeTestRenderer.create(element, defaultOptions)
}

export type R3FTestScene = Awaited<ReturnType<typeof createR3FTestScene>>
