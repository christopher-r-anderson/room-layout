import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { focusSelectedInView, setCameraPreset } from './view-actions'

describe('view-actions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEditorLifecycleStore()
  })

  it('setCameraPreset waits until the scene is ready', () => {
    const preset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockReturnValue(undefined)
    const ready = vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

    setCameraPreset('front')
    expect(preset).not.toHaveBeenCalled()

    ready.mockReturnValue(true)
    setCameraPreset('front')
    expect(preset).toHaveBeenCalledWith('front')
  })

  it('focusSelectedInView is a no-op while the scene is not ready', () => {
    const focus = vi
      .spyOn(sceneCommands, 'focusSelected')
      .mockReturnValue(undefined)
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    editorLifecycleActions.markAssetsReady()

    focusSelectedInView()
    expect(focus).not.toHaveBeenCalled()
  })
})
