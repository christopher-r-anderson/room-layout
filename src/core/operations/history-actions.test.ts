// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import { announcementActions } from '@/core/stores/announcement-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/core/stores/editor-runtime-store'
import { redo, undo } from './history-actions'

vi.mock('@/core/stores/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/core/operations/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

beforeEach(() => {
  resetEditorRuntimeStore()
  editorRuntimeActions.markAssetsReady()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('history-actions', () => {
  it('skips scene undo/redo when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const undoSpy = vi.spyOn(sceneCommands, 'undo')
    const redoSpy = vi.spyOn(sceneCommands, 'redo')

    undo()
    redo()

    expect(undoSpy).not.toHaveBeenCalled()
    expect(redoSpy).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
  })

  it('skips scene undo/redo when editor interactions are disabled', () => {
    resetEditorRuntimeStore()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const undoSpy = vi.spyOn(sceneCommands, 'undo')
    const redoSpy = vi.spyOn(sceneCommands, 'redo')

    undo()
    redo()

    expect(undoSpy).not.toHaveBeenCalled()
    expect(redoSpy).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
  })

  it('announces and queues outliner focus on a successful undo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)

    undo()

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

    redo()

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

    undo()

    expect(announcementActions.announcePolite).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })
})
