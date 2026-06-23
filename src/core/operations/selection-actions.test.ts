// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionMetaStore,
  selectionMetaStore,
} from '@/core/stores/selection-meta-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneCommands } from '@/scene/scene-commands'
import { selectionEffects } from '@/core/operations/selection-effects'
import {
  clearSelection,
  selectByCanvasPointer,
  selectById,
} from './selection-actions'

vi.mock('@/core/operations/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

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

describe('selection-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetSelectionMetaStore()
    resetEditorLifecycleStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    editorLifecycleActions.markAssetsReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('skips scene commands when interactions are disabled', () => {
    resetEditorLifecycleStore()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const selectByIdSpy = vi.spyOn(sceneCommands, 'selectById')
    const clearSelectionSpy = vi.spyOn(sceneCommands, 'clearSelection')

    expect(selectById('chair-1', 'panel-keyboard')).toEqual({
      ok: false,
      status: 'not-found',
    })
    clearSelection()

    expect(selectByIdSpy).not.toHaveBeenCalled()
    expect(clearSelectionSpy).not.toHaveBeenCalled()
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
    expect(selectionMetaStore.getState().selectedSource).toBe('canvas-pointer')
  })

  it('clears pending source when toggling the same selection off via canvas pointer', () => {
    sceneDocumentActions.setSelectedId('chair-1')

    selectByCanvasPointer('chair-1')

    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith(null)
    expect(selectionEffects.notePendingSource).toHaveBeenCalledWith(null)
  })

  it('routes selectById announce mode based on the interaction source', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'selectById').mockImplementation((id) => {
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
    expect(selectionMetaStore.getState().selectedSource).toBe('panel-keyboard')
  })

  it('clears the editor message and pending behavior on clear selection', () => {
    sceneDocumentActions.setEditorMessage('stale')
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const clearSelectionSpy = vi
      .spyOn(sceneCommands, 'clearSelection')
      .mockImplementation(() => undefined)

    clearSelection()

    expect(clearSelectionSpy).toHaveBeenCalled()
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'default',
      requestOutlinerFocus: false,
    })
    expect(sceneDocumentStore.getState().editorMessage).toBeNull()
  })
})
