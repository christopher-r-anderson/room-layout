// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
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
  useSelectionEffectsReconciler,
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

beforeEach(() => {
  resetSceneStateStore()
  resetSelectionMetaStore()
  resetEditorRuntimeStore()
  resetSelectionEffects()
  editorRuntimeActions.markAssetsReady()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useSelectionEffectsReconciler', () => {
  it('requests outliner focus after delete when an index is queued', () => {
    renderHook(() => {
      useSelectionEffectsReconciler()
    })

    act(() => {
      selectionEffects.notePostDeleteOutlinerFocusIndex(2)
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
    })

    expect(selectionMetaStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 2 }),
    )
  })

  it('reconciles the next selection source only when selection changes', () => {
    const setSelectedSourceSpy = vi.spyOn(
      selectionMetaStore.getState(),
      'setSelectedSource',
    )

    renderHook(() => {
      useSelectionEffectsReconciler()
    })

    act(() => {
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
      selectionEffects.notePendingSource('panel-pointer')
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(selectionMetaStore.getState().selectedSource).toBe('panel-pointer')
    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)

    act(() => {
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(setSelectedSourceSpy).toHaveBeenCalledTimes(1)
  })

  it('announces selection changes for each special mode', () => {
    renderHook(() => {
      useSelectionEffectsReconciler()
    })

    act(() => {
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
      selectionEffects.notePendingSelection({
        announceMode: 'added',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
    )

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    act(() => {
      selectionEffects.notePendingSelection({
        announceMode: 'panel-keyboard',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected.',
    )

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    act(() => {
      selectionEffects.notePendingSelection({
        announceMode: 'canvas-keyboard',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcementActions.announcePolite).toHaveBeenCalledWith(
      'Chair selected. Press Tab to reach selected item actions and details.',
    )
  })

  it('clears stale pending behavior when items change without selection changing', () => {
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)
    renderHook(() => {
      useSelectionEffectsReconciler()
    })

    act(() => {
      selectionEffects.notePendingSelection({
        announceMode: 'suppress',
        requestOutlinerFocus: true,
      })
      sceneStateActions.setHistory(createHistoryState([{ ...CHAIR }]))
    })

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })
})
