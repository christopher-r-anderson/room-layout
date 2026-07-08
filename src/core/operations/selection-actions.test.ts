// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
  useSceneSessionStore,
} from '@/core/stores/scene-session-store'
import {
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
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
  announceSelectionChange,
  clearCanvasSelection,
  clearSelection,
  selectByCanvasPointer,
  selectById,
} from './selection-actions'

const politeText = () => feedbackStoreForTests.getState().polite.text

function resetStores() {
  resetSceneDocumentStore()
  resetSceneSessionStore()
  resetSelectionStore()
  resetEditorLifecycleStore()
  resetFeedbackStore()
}

describe('selection-actions', () => {
  beforeEach(() => {
    resetStores()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    editorLifecycleActions.markAssetsReady()
  })

  afterEach(() => {
    resetStores()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('clearCanvasSelection clears the selection and the canvas-miss preview together', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    selectionActions.setSelection('chair-1', 'canvas-pointer')
    sceneSessionActions.setPreviewedId('chair-1')

    clearCanvasSelection()

    // The Escape/canvas-miss path must run the full clearSelection wrapper:
    // the selection-clear mutation plus the canvas-miss preview clear.
    expect(useSelectionStore.getState().selectedId).toBeNull()
    expect(useSceneSessionStore.getState().previewedIdRaw).toBeNull()
  })

  it('skips document mutations when the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    expect(selectById('chair-1', 'panel-keyboard')).toEqual({
      ok: false,
      status: 'not-found',
    })
    clearSelection()

    // Neither action reached the document mutations: the selection pointer and
    // its provenance are untouched, and nothing announced.
    expect(useSelectionStore.getState().selectedId).toBe('chair-1')
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-pointer')
    expect(politeText()).toBe('')
  })

  it('selects and announces a canvas pointer selection', () => {
    selectByCanvasPointer('chair-1')

    expect(useSelectionStore.getState().selectedId).toBe('chair-1')
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-pointer')
    expect(politeText()).toBe('Chair selected.')
  })

  it('does not announce a canvas pointer reselect of the same item', () => {
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    selectByCanvasPointer('chair-1')

    expect(politeText()).toBe('')
  })

  it('routes selectById announcements by the interaction source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)

    selectById('chair-1', 'panel-keyboard')

    expect(politeText()).toBe('Chair selected.')
    expect(useSelectionStore.getState().selectedSource).toBe('panel-keyboard')

    selectionActions.setSelection(null, null)
    selectById('chair-1', 'canvas-keyboard')

    expect(politeText()).toBe(
      'Chair selected. Press Shift+T to reach its actions.',
    )
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-keyboard')
  })

  it('does not announce when selectById lands on the already-selected item', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    selectionActions.setSelection('chair-1', 'panel-keyboard')

    selectById('chair-1', 'panel-keyboard')

    expect(politeText()).toBe('')
  })

  it('announces an added item through the added mode', () => {
    announceSelectionChange({
      announceMode: 'added',
      items: [CHAIR],
      newId: CHAIR.id,
      previousSelectedId: null,
    })

    expect(politeText()).toBe('Chair added to room.')
  })

  it('announces a landed clear', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    clearSelection()

    expect(useSelectionStore.getState().selectedId).toBeNull()
    expect(politeText()).toBe('Selection cleared.')
  })

  it('does not announce a clear that was blocked by the mutation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    selectionActions.setSelection('chair-1', 'canvas-pointer')
    // The mutation no-ops mid-drag: the store keeps its selection.
    sceneSessionActions.setDragging(true)

    clearSelection()

    expect(useSelectionStore.getState().selectedId).toBe('chair-1')
    expect(politeText()).toBe('')
  })
})
