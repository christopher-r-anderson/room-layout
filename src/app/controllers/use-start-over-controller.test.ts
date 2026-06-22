// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSceneStateStore,
  sceneStateStore,
} from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import { clearSceneDraft } from '@/editor-state/scene-draft'
import { announcementActions } from '@/editor-state/announcement-store'
import { selectionEffects } from '@/editor-state/selection-effects'
import { useStartOverController } from './use-start-over-controller'

vi.mock('@/editor-state/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/editor-state/scene-draft', () => ({
  clearSceneDraft: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useStartOverController', () => {
  beforeEach(() => {
    resetSceneStateStore()
    vi.mocked(clearSceneDraft).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('clears the editor message when openStartOver returns true', () => {
    sceneStateStore.getState().setEditorMessage('stale')
    const dialogState = {
      closeActiveDialog: vi.fn(),
      openStartOverDialog: vi.fn().mockReturnValue(true),
    }

    const { result } = renderHook(() =>
      useStartOverController({
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
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
    const clearPreview = vi.fn()

    const { result } = renderHook(() =>
      useStartOverController({
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
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
    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
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
        closeActiveDialog: dialogState.closeActiveDialog,
        openStartOverDialog: dialogState.openStartOverDialog,
        canStartOver: true,
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
