// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import { announcementActions } from '@/editor-state/announcement-store'
import { selectionEffects } from '@/editor-state/selection-effects'
import { useHistoryController } from './use-history-controller'

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/editor-state/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

describe('useHistoryController', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('skips scene undo/redo when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const undo = vi.spyOn(sceneCommands, 'undo')
    const redo = vi.spyOn(sceneCommands, 'redo')

    const { result } = renderHook(() =>
      useHistoryController({
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleUndo()
      result.current.handleRedo()
    })

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
  })

  it('skips scene undo/redo when editor interactions are disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const undo = vi.spyOn(sceneCommands, 'undo')
    const redo = vi.spyOn(sceneCommands, 'redo')

    const { result } = renderHook(() =>
      useHistoryController({
        editorInteractionsEnabled: false,
      }),
    )

    act(() => {
      result.current.handleUndo()
      result.current.handleRedo()
    })

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
  })

  it('announces and queues outliner focus on a successful undo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)

    const { result } = renderHook(() =>
      useHistoryController({
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleUndo()
    })

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Undo complete.',
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('announces and queues outliner focus on a successful redo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'redo').mockReturnValue(true)

    const { result } = renderHook(() =>
      useHistoryController({
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleRedo()
    })

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Redo complete.',
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('does not announce when undo returns false', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'undo').mockReturnValue(false)

    const { result } = renderHook(() =>
      useHistoryController({
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleUndo()
    })

    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })
})
