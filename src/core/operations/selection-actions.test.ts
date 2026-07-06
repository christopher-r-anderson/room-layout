// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  feedbackActions,
  feedbackStoreForTests,
} from '@/core/stores/feedback-store'
import {
  resetSelectionFocusStore,
  useSelectionFocusStore,
} from '@/core/stores/selection-focus-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneCommands } from '@/core/scene-commands'
import { selectionEffects } from '@/core/operations/selection-effects'
import { CHAIR } from '@/test/support/furniture'
import {
  clearSelection as clearDocumentSelection,
  selectById as selectDocumentById,
} from './selection-mutations'
import {
  clearCanvasSelection,
  clearSelection,
  selectByCanvasPointer,
  selectById,
} from './selection-actions'

vi.mock('./selection-mutations', () => ({
  clearSelection: vi.fn(),
  selectById: vi.fn(),
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

describe('selection-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionFocusStore()
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
    sceneDocumentActions.setPreviewedId('chair-1')

    clearCanvasSelection()

    // The document selection-clear is a mutation delegation; the canvas-miss
    // preview clear is observable in the document store.
    expect(clearDocumentSelection).toHaveBeenCalled()
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

  it('reconciles canvas pointer selection through selectionEffects', () => {
    selectByCanvasPointer('chair-1')

    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(
      'canvas-pointer',
    )
    expect(useSelectionFocusStore.getState().selectedSource).toBe(
      'canvas-pointer',
    )
  })

  it('clears pending source when toggling the same selection off via canvas pointer', () => {
    sceneDocumentActions.setSelectedId('chair-1')

    selectByCanvasPointer('chair-1')

    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
  })

  it('routes selectById announce mode based on the interaction source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(selectDocumentById).mockImplementation((id) => {
      sceneDocumentActions.setSelectedId(id)
      return { ok: true, status: 'selected' }
    })

    selectById('chair-1', 'panel-keyboard')

    expect(selectionEffects.notePendingSelection).toHaveBeenLastCalledWith({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(
      'panel-keyboard',
    )
    expect(useSelectionFocusStore.getState().selectedSource).toBe(
      'panel-keyboard',
    )
  })

  it('clears the editor message and pending behavior on clear selection', () => {
    feedbackActions.setStatusMessage('stale')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)

    clearSelection()

    expect(clearDocumentSelection).toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    expect(feedbackStoreForTests.getState().statusMessage).toBeNull()
  })
})
