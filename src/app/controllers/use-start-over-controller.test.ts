// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSceneStateStore,
  sceneStateStore,
} from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import { clearSceneDraft } from '@/features/url-scene/scene-draft'
import { useStartOverController } from './use-start-over-controller'

vi.mock('@/features/url-scene/scene-draft', () => ({
  clearSceneDraft: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

function createSelectionEffects() {
  return {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  }
}

describe('useStartOverController', () => {
  beforeEach(() => {
    resetSceneStateStore()
    vi.mocked(clearSceneDraft).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears the editor message when openStartOver returns true', () => {
    sceneStateStore.getState().setEditorMessage('stale')
    const dialogState = {
      closeActiveDialog: vi.fn(),
      openStartOverDialog: vi.fn().mockReturnValue(true),
    }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useStartOverController({
        announcements: { announcePolite: vi.fn() },
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
        selectionEffects,
        clearPreview: vi.fn(),
        defaults: {
          floorFinishId: 'floor-default',
          wallFinishId: 'wall-default',
        },
      }),
    )

    act(() => {
      result.current.handleOpenStartOverDialog()
    })

    expect(dialogState.openStartOverDialog).toHaveBeenCalled()
    expect(sceneStateStore.getState().editorMessage).toBeNull()
  })

  it('threads clearPreview through usePreviewController on confirm and resets defaults', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const restoreInitialLayout = vi
      .spyOn(sceneCommands, 'restoreInitialLayout')
      .mockImplementation(() => undefined)
    const setCameraPreset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockImplementation(() => undefined)
    const dialogState = {
      closeActiveDialog: vi.fn(),
      openStartOverDialog: vi.fn().mockReturnValue(true),
    }
    const selectionEffects = createSelectionEffects()
    const clearPreview = vi.fn()
    const announcements = { announcePolite: vi.fn() }

    const { result } = renderHook(() =>
      useStartOverController({
        announcements,
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
        selectionEffects,
        clearPreview,
        defaults: {
          floorFinishId: 'floor-default',
          wallFinishId: 'wall-default',
        },
      }),
    )

    act(() => {
      result.current.handleConfirmStartOver()
    })

    expect(dialogState.closeActiveDialog).toHaveBeenCalled()
    expect(clearPreview).toHaveBeenCalledTimes(1)
    expect(restoreInitialLayout).toHaveBeenCalledWith([])
    expect(setCameraPreset).toHaveBeenCalledWith('corner')
    expect(sceneStateStore.getState().floorFinishId).toBe('floor-default')
    expect(sceneStateStore.getState().wallFinishId).toBe('wall-default')
    expect(clearSceneDraft).toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })
    expect(announcements.announcePolite).toHaveBeenCalledWith(
      'Started over. Your changes were cleared.',
    )
  })

  it('skips camera preset when scene is not ready but still resets state', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const restoreInitialLayout = vi
      .spyOn(sceneCommands, 'restoreInitialLayout')
      .mockImplementation(() => undefined)
    const setCameraPreset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockImplementation(() => undefined)
    const dialogState = {
      closeActiveDialog: vi.fn(),
      openStartOverDialog: vi.fn(),
    }
    const clearPreview = vi.fn()

    const { result } = renderHook(() =>
      useStartOverController({
        announcements: { announcePolite: vi.fn() },
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
        selectionEffects: createSelectionEffects(),
        clearPreview,
        defaults: { floorFinishId: 'floor', wallFinishId: 'wall' },
      }),
    )

    act(() => {
      result.current.handleConfirmStartOver()
    })

    expect(restoreInitialLayout).toHaveBeenCalled()
    expect(setCameraPreset).not.toHaveBeenCalled()
    expect(clearPreview).toHaveBeenCalled()
  })
})
