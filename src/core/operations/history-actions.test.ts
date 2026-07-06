// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/core/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { redo as redoDocument, undo as undoDocument } from './history-mutations'
import { redo, undo } from './history-actions'

vi.mock('./history-mutations', () => ({
  redo: vi.fn(),
  restoreInitialLayout: vi.fn(),
  undo: vi.fn(),
}))

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
    setStatusMessage: vi.fn(),
    clearStatusMessage: vi.fn(),
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
  resetEditorLifecycleStore()
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('history-actions', () => {
  it('skips document undo/redo when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

    undo()
    redo()

    expect(undoDocument).not.toHaveBeenCalled()
    expect(redoDocument).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
  })

  it('announces and queues outliner focus on a successful undo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(true)

    undo()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Undo complete.',
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('announces and queues outliner focus on a successful redo', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(redoDocument).mockReturnValue(true)

    redo()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Redo complete.',
    )
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
  })

  it('does not announce when undo returns false', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(false)

    undo()

    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
  })
})
