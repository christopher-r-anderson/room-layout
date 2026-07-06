// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OutlinerFocusRequest } from '../types/outliner.types'
import {
  resetSelectionFocusStore,
  selectionFocusActions,
  useSelectionFocusStore,
} from './selection-focus-store'

beforeEach(() => {
  resetSelectionFocusStore()
})

describe('useSelectionFocusStore', () => {
  it('tracks selected source transitions', () => {
    expect(useSelectionFocusStore.getState().selectedSource).toBeNull()

    selectionFocusActions.setSelectedSource('canvas-pointer')
    expect(useSelectionFocusStore.getState().selectedSource).toBe(
      'canvas-pointer',
    )

    selectionFocusActions.setSelectedSource(null)
    expect(useSelectionFocusStore.getState().selectedSource).toBeNull()
  })

  it('tracks outliner focus request lifecycle', () => {
    const request: OutlinerFocusRequest = {
      token: 101,
      targetSelectedId: 'chair-1',
    }

    expect(useSelectionFocusStore.getState().outlinerFocusRequest).toBeNull()

    selectionFocusActions.requestOutlinerFocus(request)
    expect(useSelectionFocusStore.getState().outlinerFocusRequest).toEqual(
      request,
    )

    selectionFocusActions.clearOutlinerFocusRequest()
    expect(useSelectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('tracks room-view focus request lifecycle', () => {
    expect(useSelectionFocusStore.getState().roomViewFocusRequest).toBeNull()

    // Pin Date.now() so the stamped token is deterministic to assert.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(42)
    selectionFocusActions.requestRoomViewFocus()
    nowSpy.mockRestore()
    expect(useSelectionFocusStore.getState().roomViewFocusRequest).toBe(42)

    selectionFocusActions.clearRoomViewFocusRequest()
    expect(useSelectionFocusStore.getState().roomViewFocusRequest).toBeNull()
  })

  it('resets selected source to defaults', () => {
    selectionFocusActions.setSelectedSource('panel-keyboard')

    resetSelectionFocusStore()

    expect(useSelectionFocusStore.getState().selectedSource).toBeNull()
  })
})
