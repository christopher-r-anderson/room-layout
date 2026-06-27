// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { OutlinerFocusRequest } from '../types/outliner.types'
import {
  resetSelectionFocusStore,
  selectionFocusActions,
  selectionFocusStore,
} from './selection-focus-store'

beforeEach(() => {
  resetSelectionFocusStore()
})

describe('selectionFocusStore', () => {
  it('tracks selected source transitions', () => {
    expect(selectionFocusStore.getState().selectedSource).toBeNull()

    selectionFocusActions.setSelectedSource('canvas-pointer')
    expect(selectionFocusStore.getState().selectedSource).toBe('canvas-pointer')

    selectionFocusActions.setSelectedSource(null)
    expect(selectionFocusStore.getState().selectedSource).toBeNull()
  })

  it('tracks outliner focus request lifecycle', () => {
    const request: OutlinerFocusRequest = {
      token: 101,
      targetSelectedId: 'chair-1',
    }

    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()

    selectionFocusActions.requestOutlinerFocus(request)
    expect(selectionFocusStore.getState().outlinerFocusRequest).toEqual(request)

    selectionFocusActions.clearOutlinerFocusRequest()
    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('tracks room-view focus request lifecycle', () => {
    expect(selectionFocusStore.getState().roomViewFocusRequest).toBeNull()

    // Drive the store method directly with a fixed token (the action wrapper
    // stamps Date.now(), which would be non-deterministic to assert).
    selectionFocusStore.getState().requestRoomViewFocus(42)
    expect(selectionFocusStore.getState().roomViewFocusRequest).toBe(42)

    selectionFocusActions.clearRoomViewFocusRequest()
    expect(selectionFocusStore.getState().roomViewFocusRequest).toBeNull()
  })

  it('resets selected source to defaults', () => {
    selectionFocusActions.setSelectedSource('panel-keyboard')

    resetSelectionFocusStore()

    expect(selectionFocusStore.getState().selectedSource).toBeNull()
  })
})
