// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
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
    resetSelectionStore()
  })

  it('queues a focus request targeting the selected item', () => {
    sceneDocumentActions.setHistory(createHistoryState([item('a'), item('b')]))
    selectionActions.setSelection('b', null)

    requestOutlinerFocus()

    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ targetSelectedId: 'b' }),
    )
  })

  it('queues a focus request for the first item when nothing is selected', () => {
    sceneDocumentActions.setHistory(createHistoryState([item('a')]))

    requestOutlinerFocus()

    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ preferredIndex: 0 }),
    )
  })

  it('queues a focus request for the outliner container when there are no items', () => {
    sceneDocumentActions.setHistory(createHistoryState([]))

    requestOutlinerFocus()

    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(
      expect.objectContaining({ focusContainer: true }),
    )
  })
})
