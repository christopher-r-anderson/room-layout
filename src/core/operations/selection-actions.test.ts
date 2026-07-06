// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
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
import { sceneCommands } from '@/core/scene-commands'
import { CHAIR } from '@/test/support/furniture'
import {
  clearSelection as clearDocumentSelection,
  selectById as selectDocumentById,
} from './selection-mutations'
import {
  announceSelectionChange,
  clearCanvasSelection,
  clearSelection,
  selectByCanvasPointer,
  selectById,
} from './selection-actions'

vi.mock('./selection-mutations', () => ({
  clearSelection: vi.fn(),
  selectById: vi.fn(),
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

// The document mutations are mocked; these implementations mirror their store
// writes so the actions observe a selection pointer that actually moved.
function mockSelectionMutationsToLand() {
  vi.mocked(selectDocumentById).mockImplementation((id, source) => {
    selectionActions.setSelection(id, source ?? null)
    return id === null
      ? ({ ok: true, status: 'cleared' } as const)
      : ({ ok: true, status: 'selected' } as const)
  })
  vi.mocked(clearDocumentSelection).mockImplementation(() => {
    selectionActions.setSelection(null, null)
  })
}

describe('selection-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionStore()
    resetEditorLifecycleStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    editorLifecycleActions.markAssetsReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('clearCanvasSelection clears the selection and the canvas-miss preview together', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockSelectionMutationsToLand()
    sceneDocumentActions.setPreviewedId('chair-1')

    clearCanvasSelection()

    // The Escape/canvas-miss path must run the full clearSelection wrapper:
    // the selection-clear mutation and the status-message clear, plus the
    // canvas-miss preview clear.
    expect(clearDocumentSelection).toHaveBeenCalled()
    expect(feedbackActions.clearStatusMessage).toHaveBeenCalled()
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
  })

  it('skips document mutations when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)

    expect(selectById('chair-1', 'panel-keyboard')).toEqual({
      ok: false,
      status: 'not-found',
    })
    clearSelection()

    expect(selectDocumentById).not.toHaveBeenCalled()
    expect(clearDocumentSelection).not.toHaveBeenCalled()
  })

  it('selects and announces a canvas pointer selection', () => {
    mockSelectionMutationsToLand()

    selectByCanvasPointer('chair-1')

    expect(selectDocumentById).toHaveBeenCalledWith('chair-1', 'canvas-pointer')
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-pointer')
    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )
  })

  it('does not announce a canvas pointer reselect of the same item', () => {
    mockSelectionMutationsToLand()
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    selectByCanvasPointer('chair-1')

    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
  })

  it('routes selectById announcements by the interaction source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockSelectionMutationsToLand()

    selectById('chair-1', 'panel-keyboard')

    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
      'Chair selected.',
    )
    expect(useSelectionStore.getState().selectedSource).toBe('panel-keyboard')

    selectionActions.setSelection(null, null)
    selectById('chair-1', 'canvas-keyboard')

    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
      'Chair selected. Press Shift+T to reach its actions.',
    )
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-keyboard')
  })

  it('does not announce when selectById lands on the already-selected item', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockSelectionMutationsToLand()
    selectionActions.setSelection('chair-1', 'panel-keyboard')

    selectById('chair-1', 'panel-keyboard')

    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
    expect(feedbackActions.clearStatusMessage).toHaveBeenCalled()
  })

  it('announces an added item through the added mode', () => {
    announceSelectionChange({
      announceMode: 'added',
      items: [CHAIR],
      newId: CHAIR.id,
      previousSelectedId: null,
    })

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
    )
  })

  it('clears the editor message and announces a landed clear', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    mockSelectionMutationsToLand()
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    clearSelection()

    expect(clearDocumentSelection).toHaveBeenCalled()
    expect(feedbackActions.clearStatusMessage).toHaveBeenCalled()
    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Selection cleared.',
    )
  })

  it('does not announce a clear that was blocked by the mutation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    // The mutation no-ops (mid-drag): the store keeps its selection.
    vi.mocked(clearDocumentSelection).mockImplementation(() => undefined)
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    clearSelection()

    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
  })
})
