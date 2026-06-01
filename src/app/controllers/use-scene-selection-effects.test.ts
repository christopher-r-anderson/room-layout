// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetSelectionMetaStore,
  selectionMetaStore,
} from '@/editor-state/selection-meta-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import { createHistoryState } from '@/lib/ui/editor-history'
import { useSceneSelectionEffects } from './use-scene-selection-effects'

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

function createAnnouncements() {
  return {
    announcePolite: vi.fn(),
  }
}

beforeEach(() => {
  resetSceneStateStore()
  resetSelectionMetaStore()
})

describe('useSceneSelectionEffects', () => {
  it('requests outliner focus after delete when an index is queued', () => {
    const announcements = createAnnouncements()
    const { result } = renderHook(() =>
      useSceneSelectionEffects({
        announcements,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.notePostDeleteOutlinerFocusIndex(2)
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
    })

    expect(selectionMetaStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 2 }),
    )
  })

  it('reconciles the next selection source only when selection changes', () => {
    const announcements = createAnnouncements()
    const setSelectedSourceSpy = vi.spyOn(
      selectionMetaStore.getState(),
      'setSelectedSource',
    )

    const { result } = renderHook(() =>
      useSceneSelectionEffects({
        announcements,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
      result.current.notePendingSource('panel-pointer')
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
    const announcements = createAnnouncements()
    const { result } = renderHook(() =>
      useSceneSelectionEffects({
        announcements,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      sceneStateActions.setHistory(createHistoryState([CHAIR]))
      result.current.notePendingSelection({
        announceMode: 'added',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcements.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
    )

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    act(() => {
      result.current.notePendingSelection({
        announceMode: 'panel-keyboard',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcements.announcePolite).toHaveBeenCalledWith(
      'Chair selected. Press Shift+Tab to reach selected item actions and details.',
    )

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    act(() => {
      result.current.notePendingSelection({
        announceMode: 'canvas-keyboard',
        requestOutlinerFocus: false,
      })
      sceneStateActions.setSelectedId(CHAIR.id)
    })

    expect(announcements.announcePolite).toHaveBeenCalledWith(
      'Chair selected. Press Tab to reach selected item actions and details.',
    )
  })

  it('clears stale pending behavior when items change without selection changing', () => {
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)
    const announcements = createAnnouncements()
    const { result } = renderHook(() =>
      useSceneSelectionEffects({
        announcements,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.notePendingSelection({
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
