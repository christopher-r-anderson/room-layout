// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/core/scene-commands'
import {
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import {
  focusActions,
  getPendingFocus,
  resetFocusStore,
} from '@/core/stores/focus-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { redo as redoDocument, undo as undoDocument } from './history-mutations'
import { redo, undo } from './history-actions'
import { stubLayout } from '@/test/support/stub-layout'

vi.mock('./history-mutations', () => ({
  redo: vi.fn(),
  restoreInitialLayout: vi.fn(),
  undo: vi.fn(),
}))

const politeText = () => feedbackStoreForTests.getState().polite.text

// The document mutation is mocked, so it will not reconcile the selection
// pointer itself; these helpers simulate that reconcile inside the mock so the
// action observes a moved (or unmoved) selection.
function mockUndoReconcilingSelectionTo(selectedId: string | null) {
  vi.mocked(undoDocument).mockImplementation(() => {
    selectionActions.setSelection(selectedId)
    return true
  })
}

beforeEach(() => {
  resetSelectionStore()
  resetFocusStore()
  resetEditorLifecycleStore()
  resetFeedbackStore()
  editorLifecycleActions.markAssetsReady()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('history-actions', () => {
  it('skips document undo/redo when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

    undo('keyboard')
    redo('keyboard')

    expect(undoDocument).not.toHaveBeenCalled()
    expect(redoDocument).not.toHaveBeenCalled()
    expect(politeText()).toBe('')
    expect(getPendingFocus()).toBeNull()
  })

  it('announces undo and directs focus to the reconciled selection in the item collection', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo('chair-2')
    selectionActions.setSelection('chair-1')

    undo('keyboard')

    expect(politeText()).toBe('Undo complete.')
    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'chair-2' },
    })
  })

  it('directs focus to the item-collection container when undo deselects', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo(null)
    selectionActions.setSelection('chair-1')

    undo('keyboard')

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'container' },
    })
  })

  it('announces redo and directs focus to the reconciled selection in the item collection', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(redoDocument).mockImplementation(() => {
      selectionActions.setSelection('chair-1')
      return true
    })

    redo('keyboard')

    expect(politeText()).toBe('Redo complete.')
    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'chair-1' },
    })
  })

  it('does not move focus when undo leaves the selection unchanged', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(true)
    selectionActions.setSelection('chair-1')

    undo('keyboard')

    expect(politeText()).toBe('Undo complete.')
    expect(getPendingFocus()).toBeNull()
  })

  it('does not move focus for a pointer undo', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo('chair-2')
    selectionActions.setSelection('chair-1')

    undo('pointer')

    expect(politeText()).toBe('Undo complete.')
    expect(getPendingFocus()).toBeNull()
  })

  it('supersedes an unrealized pending focus directive', () => {
    stubLayout('desktop')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockUndoReconcilingSelectionTo('chair-2')
    selectionActions.setSelection('chair-1')
    focusActions.setPendingFocus({
      surface: 'item-collection',
      target: { kind: 'index', index: 1 },
    })

    undo('keyboard')

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'chair-2' },
    })
  })

  it('does not announce when undo returns false', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(undoDocument).mockReturnValue(false)

    undo('keyboard')

    expect(politeText()).toBe('')
    expect(getPendingFocus()).toBeNull()
  })
})
