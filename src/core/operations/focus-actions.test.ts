// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { requestOutlinerFocus } from './focus-actions'

function item(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'chair',
    collectionId: 'collection-1',
    footprintSize: { width: 1, depth: 1 },
    kind: 'armchair',
    name: id,
    nodeName: 'ChairNode',
    position: [0, 0, 0],
    rotationY: 0,
    sourcePath: '/models/chair.glb',
  }
}

describe('requestOutlinerFocus', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('targets the selected item when one is selected', () => {
    const spy = vi.spyOn(selectionFocusActions, 'requestOutlinerFocus')
    sceneDocumentActions.setHistory(createHistoryState([item('a'), item('b')]))
    sceneDocumentActions.setSelectedId('b')

    requestOutlinerFocus()

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ targetSelectedId: 'b' }),
    )
  })

  it('targets the first item when nothing is selected but items exist', () => {
    const spy = vi.spyOn(selectionFocusActions, 'requestOutlinerFocus')
    sceneDocumentActions.setHistory(createHistoryState([item('a')]))

    requestOutlinerFocus()

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ preferredIndex: 0 }),
    )
  })

  it('targets the outliner container when there are no items', () => {
    const spy = vi.spyOn(selectionFocusActions, 'requestOutlinerFocus')
    sceneDocumentActions.setHistory(createHistoryState([]))

    requestOutlinerFocus()

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ focusContainer: true }),
    )
  })
})
