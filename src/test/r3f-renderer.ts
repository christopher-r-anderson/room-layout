/**
 * Shared React Three Test Renderer setup for consistent test patterns.
 * Wraps @react-three/test-renderer with project defaults.
 */

import type { ReactElement } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'

/**
 * Create a test renderer instance with project defaults.
 *
 * - Camera defaults avoid undefined projection values in jsdom tests.
 * - Stub renderer is provided by @react-three/test-renderer (no WebGL needed).
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

/**
 * Helper to inspect scene tree for debugging.
 */
export function inspectSceneGraph(renderer: R3FTestScene): void {
  console.log(renderer.toGraph())
}
