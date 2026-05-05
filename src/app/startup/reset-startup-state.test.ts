import { describe, expect, it, vi } from 'vitest'
import { runStartupReset } from './reset-startup-state'
import type { SceneRef } from '@/scene/scene.types'

describe('runStartupReset', () => {
  it('clears overlay-local state and then nulls the scene ref', () => {
    const scene = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      deleteSelection: vi.fn(),
      getSnapshot: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      undo: vi.fn(),
    } as unknown as SceneRef
    const sceneRef = { current: scene }
    let refSeenDuringReset: SceneRef | null = null

    runStartupReset({
      resetOverlayState: () => {
        refSeenDuringReset = sceneRef.current
      },
      sceneRef,
    })

    expect(refSeenDuringReset).toBe(scene)
    expect(sceneRef.current).toBeNull()
  })
})
