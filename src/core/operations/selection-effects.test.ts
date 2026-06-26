// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSelectionFocusStore,
  selectionFocusStore,
} from '@/core/stores/selection-focus-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { feedbackActions } from '@/core/stores/feedback-store'
import {
  resetSelectionEffects,
  selectionEffects,
  startSelectionEffectsReconciler,
} from '@/core/operations/selection-effects'

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

const CHAIR = {
  id: 'chair-1',
  catalogId: 'chair-1',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair' as const,
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

// Reconciliation is deferred to a microtask; awaiting a resolved promise drains
// the queued reconcile before assertions run.
const flushReconcile = () => Promise.resolve()

let stopReconciler: () => void

beforeEach(() => {
  resetSceneDocumentStore()
  resetSelectionFocusStore()
  resetEditorLifecycleStore()
  resetSelectionEffects()
  editorLifecycleActions.markAssetsReady()
  stopReconciler = startSelectionEffectsReconciler()
})

afterEach(() => {
  stopReconciler()
  vi.clearAllMocks()
})

describe('startSelectionEffectsReconciler', () => {
  it('requests outliner focus after delete when an index is queued', async () => {
    selectionEffects.notePostDeleteOutlinerFocusIndex(2)
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    await flushReconcile()

    expect(selectionFocusStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 2 }),
    )
  })

  it('reconciles the next selection source only when selection changes', async () => {
    const setSelectedSourceSpy = vi.spyOn(
      selectionFocusStore.getState(),
      'setSelectedSource',
    )

    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    selectionEffects.notePendingSource('panel-pointer')
    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(selectionFocusStore.getState().selectedSource).toBe('panel-pointer')
    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)

    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)
  })

  it('announces selection changes for each special mode', async () => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    selectionEffects.notePendingSelection({
      announceMode: 'added',
      requestOutlinerFocus: false,
    })
    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
    )

    sceneDocumentActions.setSelectedId(null)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )

    sceneDocumentActions.setSelectedId(null)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'canvas-keyboard',
      requestOutlinerFocus: false,
    })
    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected. Press Shift+T to reach its actions.',
    )
  })

  it('clears stale pending behavior when items change without selection changing', async () => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
    sceneDocumentActions.setHistory(createHistoryState([{ ...CHAIR }]))
    await flushReconcile()

    sceneDocumentActions.setSelectedId(null)
    await flushReconcile()

    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('defers reconciliation until pending intent noted after the mutation lands', async () => {
    // Mutation happens first (synchronous store write), then the consumer notes
    // its intent — the reconcile must run after both.
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)
    selectionEffects.notePendingSelection({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    await flushReconcile()

    expect(feedbackActions.announcePolite).toHaveBeenCalledTimes(1)
    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )
  })
})
