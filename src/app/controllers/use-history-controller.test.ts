// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import { useHistoryController } from './use-history-controller'

function createSelectionEffects() {
  return {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  }
}

describe('useHistoryController', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips scene undo/redo when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const undo = vi.spyOn(sceneCommands, 'undo')
    const redo = vi.spyOn(sceneCommands, 'redo')
    const announcements = { announcePolite: vi.fn() }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useHistoryController({
        announcements,
        editorInteractionsEnabled: true,
        selectionEffects,
      }),
    )

    act(() => {
      result.current.handleUndo()
      result.current.handleRedo()
    })

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcements.announcePolite).not.toHaveBeenCalled()
  })

  it('skips scene undo/redo when editor interactions are disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const undo = vi.spyOn(sceneCommands, 'undo')
    const redo = vi.spyOn(sceneCommands, 'redo')
    const announcements = { announcePolite: vi.fn() }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useHistoryController({
        announcements,
        editorInteractionsEnabled: false,
        selectionEffects,
      }),
    )

    act(() => {
      result.current.handleUndo()
      result.current.handleRedo()
    })

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcements.announcePolite).not.toHaveBeenCalled()
  })

  it('announces and queues outliner focus on a successful undo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)
    const announcements = { announcePolite: vi.fn() }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useHistoryController({
        announcements,
        editorInteractionsEnabled: true,
        selectionEffects,
      }),
    )

    act(() => {
      result.current.handleUndo()
    })

    expect(announcements.announcePolite).toHaveBeenCalledWith('Undo complete.')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('announces and queues outliner focus on a successful redo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'redo').mockReturnValue(true)
    const announcements = { announcePolite: vi.fn() }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useHistoryController({
        announcements,
        editorInteractionsEnabled: true,
        selectionEffects,
      }),
    )

    act(() => {
      result.current.handleRedo()
    })

    expect(announcements.announcePolite).toHaveBeenCalledWith('Redo complete.')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('does not announce when undo returns false', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'undo').mockReturnValue(false)
    const announcements = { announcePolite: vi.fn() }
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useHistoryController({
        announcements,
        editorInteractionsEnabled: true,
        selectionEffects,
      }),
    )

    act(() => {
      result.current.handleUndo()
    })

    expect(announcements.announcePolite).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })
})
