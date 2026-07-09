// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
  type OutlinerFocusRequest,
} from './selection-store'

beforeEach(() => {
  resetSelectionStore()
})

describe('useSelectionStore', () => {
  it('writes the selected id and its source atomically', () => {
    expect(useSelectionStore.getState().selectedId).toBeNull()
    expect(useSelectionStore.getState().selectedSource).toBeNull()

    selectionActions.setSelection('chair-1', 'canvas-pointer')

    expect(useSelectionStore.getState().selectedId).toBe('chair-1')
    expect(useSelectionStore.getState().selectedSource).toBe('canvas-pointer')

    selectionActions.setSelection('chair-2', 'panel-keyboard')

    expect(useSelectionStore.getState().selectedId).toBe('chair-2')
    expect(useSelectionStore.getState().selectedSource).toBe('panel-keyboard')
  })

  it('forces the source null when the selection clears', () => {
    selectionActions.setSelection('chair-1', 'canvas-keyboard')

    selectionActions.setSelection(null, 'canvas-keyboard')

    expect(useSelectionStore.getState().selectedId).toBeNull()
    expect(useSelectionStore.getState().selectedSource).toBeNull()
  })

  it('tracks outliner focus request lifecycle', () => {
    const request: OutlinerFocusRequest = {
      targetSelectedId: 'chair-1',
    }

    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()

    selectionActions.requestOutlinerFocus(request)
    expect(useSelectionStore.getState().outlinerFocusRequest).toEqual(request)

    selectionActions.clearOutlinerFocusRequest()
    expect(useSelectionStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('tracks room-view focus request lifecycle', () => {
    expect(useSelectionStore.getState().roomViewFocusRequest).toBe(false)

    selectionActions.requestRoomViewFocus()
    expect(useSelectionStore.getState().roomViewFocusRequest).toBe(true)

    selectionActions.clearRoomViewFocusRequest()
    expect(useSelectionStore.getState().roomViewFocusRequest).toBe(false)
  })

  it('resets the selection session to defaults', () => {
    selectionActions.setSelection('chair-1', 'panel-keyboard')
    selectionActions.requestOutlinerFocus({ focusContainer: true })

    resetSelectionStore()

    expect(useSelectionStore.getState()).toMatchObject({
      selectedId: null,
      selectedSource: null,
      outlinerFocusRequest: null,
      roomViewFocusRequest: false,
    })
  })
})
