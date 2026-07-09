// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
import { dialogActions, resetDialogStore } from '@/core/stores/dialog-store'
import {
  requestOutlinerFocus,
  startOutlinerFocusReconciler,
} from './focus-actions'

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

describe('startOutlinerFocusReconciler', () => {
  let stop: () => void

  beforeEach(() => {
    resetDialogStore()
    resetSelectionStore()
    dialogActions.configureRuntimeContext({
      isDialogsEnabled: () => true,
      getSelectedFurniture: () => null,
      canStartOver: () => true,
    })
    dialogActions.registerDialogDefinitions([
      { id: 'delete', kind: 'blocking' },
      { id: 'room-surface', kind: 'non-blocking' },
    ])
    stop = startOutlinerFocusReconciler()
  })

  afterEach(() => {
    stop()
    resetDialogStore()
    resetSelectionStore()
  })

  it('clears a pending outliner-focus request when a blocking overlay opens', () => {
    selectionActions.requestOutlinerFocus({
      focusContainer: true,
    })
    expect(useSelectionStore.getState().outlinerFocusRequest).not.toBeNull()

    dialogActions.openDialog('delete')

    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('leaves the request when a non-blocking overlay opens', () => {
    selectionActions.requestOutlinerFocus({
      focusContainer: true,
    })

    dialogActions.openDialog('room-surface')

    expect(useSelectionStore.getState().outlinerFocusRequest).not.toBeNull()
  })
})
