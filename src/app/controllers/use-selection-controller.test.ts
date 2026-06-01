// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
} from '@/editor-state/scene-state-store'
import {
  resetSelectionMetaStore,
  selectionMetaStore,
} from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import { useSelectionController } from './use-selection-controller'

function createSelectionEffects() {
  return {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  }
}

const CHAIR = {
  id: 'chair-1',
  catalogId: 'chair',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair' as const,
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

describe('useSelectionController', () => {
  beforeEach(() => {
    resetSceneStateStore()
    resetSelectionMetaStore()
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips scene commands when interactions are disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const selectById = vi.spyOn(sceneCommands, 'selectById')
    const clearSelection = vi.spyOn(sceneCommands, 'clearSelection')
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useSelectionController({
        selectionEffects,
        editorInteractionsEnabled: false,
      }),
    )

    expect(
      result.current.handleSelectById('chair-1', 'panel-keyboard'),
    ).toEqual({ ok: false, status: 'not-found' })
    act(() => {
      result.current.handleClearSelection()
    })

    expect(selectById).not.toHaveBeenCalled()
    expect(clearSelection).not.toHaveBeenCalled()
  })

  it('reconciles canvas pointer selection through selectionEffects', () => {
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useSelectionController({
        selectionEffects,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleCanvasPointerSelection('chair-1')
    })

    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(
      'canvas-pointer',
    )
    expect(selectionMetaStore.getState().selectedSource).toBe('canvas-pointer')
  })

  it('clears pending source when toggling the same selection off via canvas pointer', () => {
    sceneStateActions.setSelectedId('chair-1')
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useSelectionController({
        selectionEffects,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleCanvasPointerSelection('chair-1')
    })

    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
  })

  it('routes selectById announce mode based on the interaction source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'selectById').mockImplementation((id) => {
      sceneStateActions.setSelectedId(id)
      return { ok: true, status: 'selected' }
    })
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useSelectionController({
        selectionEffects,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleSelectById('chair-1', 'panel-keyboard')
    })

    expect(selectionEffects.notePendingSelection).toHaveBeenLastCalledWith({
      announceMode: 'panel-keyboard',
      requestOutlinerFocus: false,
    })
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(
      'panel-keyboard',
    )
    expect(selectionMetaStore.getState().selectedSource).toBe('panel-keyboard')
  })

  it('clears the editor message and pending behavior on clear selection', () => {
    sceneStateActions.setEditorMessage('stale')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const clearSelection = vi
      .spyOn(sceneCommands, 'clearSelection')
      .mockImplementation(() => undefined)
    const selectionEffects = createSelectionEffects()

    const { result } = renderHook(() =>
      useSelectionController({
        selectionEffects,
        editorInteractionsEnabled: true,
      }),
    )

    act(() => {
      result.current.handleClearSelection()
    })

    expect(clearSelection).toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    expect(sceneStateStore.getState().editorMessage).toBeNull()
  })
})
