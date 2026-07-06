// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/core/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
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

// The document mutation is mocked, so it will not reconcile the selection
// pointer itself; these helpers simulate that reconcile inside the mock so the
// action observes a moved (or unmoved) selection.
function mockUndoReconcilingSelectionTo(selectedId: string | null) {
  vi.mocked(undoDocument).mockImplementation(() => {
    selectionActions.setSelection(selectedId, null)
    return true
  })
}

beforeEach(() => {
  resetSelectionStore()
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
    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('announces undo and focuses the reconciled selection in the outliner', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo('chair-2')
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    undo()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Undo complete.',
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ targetSelectedId: 'chair-2' }),
    )
  })

  it('focuses the outliner container when undo deselects', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo(null)
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    undo()

    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ focusContainer: true }),
    )
  })

  it('announces redo and focuses the reconciled selection in the outliner', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(redoDocument).mockImplementation(() => {
      selectionActions.setSelection('chair-1', null)
      return true
    })

    redo()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Redo complete.',
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ targetSelectedId: 'chair-1' }),
    )
  })

  it('does not move focus when undo leaves the selection unchanged', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(true)
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    undo()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Undo complete.',
    )
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('leaves an already-pending outliner focus request in place', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo('chair-2')
    selectionActions.setSelection('chair-1', 'canvas-pointer')
    selectionActions.requestOutlinerFocus({ token: 7, preferredIndex: 1 })

    undo()

    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ token: 7, preferredIndex: 1 }),
    )
  })

  it('does not announce when undo returns false', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(false)

    undo()

    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })
})
