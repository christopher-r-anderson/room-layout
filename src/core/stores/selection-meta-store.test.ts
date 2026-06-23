// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { SceneOutlinerFocusRequest } from '../types/scene-panel.types'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  selectionMetaStore,
} from './selection-meta-store'

beforeEach(() => {
  resetSelectionMetaStore()
})

describe('selectionMetaStore', () => {
  it('tracks selected source transitions', () => {
    expect(selectionMetaStore.getState().selectedSource).toBeNull()

    selectionMetaActions.setSelectedSource('canvas-pointer')
    expect(selectionMetaStore.getState().selectedSource).toBe('canvas-pointer')

    selectionMetaActions.setSelectedSource(null)
    expect(selectionMetaStore.getState().selectedSource).toBeNull()
  })

  it('tracks outliner focus request lifecycle', () => {
    const request: SceneOutlinerFocusRequest = {
      token: 101,
      targetSelectedId: 'chair-1',
    }

    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()

    selectionMetaActions.requestOutlinerFocus(request)
    expect(selectionMetaStore.getState().outlinerFocusRequest).toEqual(request)

    selectionMetaActions.clearOutlinerFocusRequest()
    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('resets selected source to defaults', () => {
    selectionMetaActions.setSelectedSource('panel-keyboard')

    resetSelectionMetaStore()

    expect(selectionMetaStore.getState().selectedSource).toBeNull()
  })
})
