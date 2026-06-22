// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSelectionMetaStore,
  selectionMetaStore,
} from '@/editor-state/selection-meta-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { announcementActions } from '@/editor-state/announcement-store'
import {
  resetSelectionEffects,
  selectionEffects,
  startSelectionEffectsReconciler,
} from '@/editor-state/selection-effects'

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
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
  resetSceneStateStore()
  resetSelectionMetaStore()
  resetEditorRuntimeStore()
  resetSelectionEffects()
  editorRuntimeActions.markAssetsReady()
  stopReconciler = startSelectionEffectsReconciler()
})

afterEach(() => {
  stopReconciler()
  vi.clearAllMocks()
})

describe('startSelectionEffectsReconciler', () => {
  it('requests outliner focus after delete when an index is queued', async () => {
    selectionEffects.notePostDeleteOutlinerFocusIndex(2)
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    await flushReconcile()

    expect(selectionMetaStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 2 }),
    )
  })

  it('reconciles the next selection source only when selection changes', async () => {
    const setSelectedSourceSpy = vi.spyOn(
      selectionMetaStore.getState(),
      'setSelectedSource',
    )

    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    selectionEffects.notePendingSource('panel-pointer')
    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(selectionMetaStore.getState().selectedSource).toBe('panel-pointer')
    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)

    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)
  })

  it('announces selection changes for each special mode', async () => {
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    selectionEffects.notePendingSelection({
      announceMode: 'added',
      requestOutlinerFocus: false,
    })
    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
    )

    sceneStateActions.setSelectedId(null)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )

    sceneStateActions.setSelectedId(null)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'canvas-keyboard',
      requestOutlinerFocus: false,
    })
    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected. Press Tab to reach selected item actions and details.',
    )
  })

  it('clears stale pending behavior when items change without selection changing', async () => {
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)
    await flushReconcile()

    selectionEffects.notePendingSelection({
      announceMode: 'suppress',
      requestOutlinerFocus: true,
    })
    sceneStateActions.setHistory(createHistoryState([{ ...CHAIR }]))
    await flushReconcile()

    sceneStateActions.setSelectedId(null)
    await flushReconcile()

    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('defers reconciliation until pending intent noted after the mutation lands', async () => {
    // Mutation happens first (synchronous store write), then the consumer notes
    // its intent — the reconcile must run after both.
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)
    selectionEffects.notePendingSelection({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    await flushReconcile()

    expect(announcementActions.announcePolite).toHaveBeenCalledTimes(1)
    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )
  })
})
