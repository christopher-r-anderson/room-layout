import { describe, expect, it, vi } from 'vitest'
import { runStartupReset } from './reset-startup-state'
import * as sceneCommandsModule from '@/scene/scene-commands'

describe('runStartupReset', () => {
  it('clears overlay-local state and then clears scene services', () => {
    const clearSceneServices = vi
      .spyOn(sceneCommandsModule, 'clearSceneServices')
      .mockImplementation(() => undefined)
    let clearCalledDuringReset = false

    runStartupReset({
      resetOverlayState: () => {
        clearCalledDuringReset = clearSceneServices.mock.calls.length > 0
      },
    })

    expect(clearCalledDuringReset).toBe(false)
    expect(clearSceneServices).toHaveBeenCalledTimes(1)

    clearSceneServices.mockRestore()
  })
})
