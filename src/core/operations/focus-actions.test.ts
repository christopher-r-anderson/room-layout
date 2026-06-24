// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionFocusStore,
  selectionFocusActions,
  selectionFocusStore,
} from '@/core/stores/selection-focus-store'
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

describe('startOutlinerFocusReconciler', () => {
  let stop: () => void

  beforeEach(() => {
    resetDialogStore()
    resetSelectionFocusStore()
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
    resetSelectionFocusStore()
  })

  it('clears a pending outliner-focus request when a blocking overlay opens', () => {
    selectionFocusActions.requestOutlinerFocus({
      token: 1,
      focusContainer: true,
    })
    expect(selectionFocusStore.getState().outlinerFocusRequest).not.toBeNull()

    dialogActions.openDialog('delete')

    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('leaves the request when a non-blocking overlay opens', () => {
    selectionFocusActions.requestOutlinerFocus({
      token: 1,
      focusContainer: true,
    })

    dialogActions.openDialog('room-surface', { payload: { layout: 'desktop' } })

    expect(selectionFocusStore.getState().outlinerFocusRequest).not.toBeNull()
  })
})
