// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { SelectedToolbarGeometry } from '@/scene/scene.types'
import type { SceneOutlinerFocusRequest } from './types/scene-panel.types'
import {
  INITIAL_SELECTED_TOOLBAR_GEOMETRY,
  resetSelectionMetaStore,
  selectionMetaActions,
  selectionMetaStore,
} from './selection-meta-store'

const AVAILABLE_GEOMETRY: SelectedToolbarGeometry = {
  kind: 'available',
  selectedId: 'chair-1',
  source: 'render-bounds',
  canvasSize: { width: 1200, height: 800 },
  sourcePointCount: 4,
  projectedPointCount: 4,
  points: [
    { x: 100, y: 200 },
    { x: 140, y: 200 },
    { x: 140, y: 240 },
    { x: 100, y: 240 },
  ],
}

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

  it('short-circuits toolbar geometry updates when the value is equal', () => {
    let notifications = 0
    const unsubscribe = selectionMetaStore.subscribe(
      (state) => state.toolbarGeometry,
      () => {
        notifications += 1
      },
    )

    selectionMetaActions.setToolbarGeometry(AVAILABLE_GEOMETRY)
    selectionMetaActions.setToolbarGeometry({
      ...AVAILABLE_GEOMETRY,
      points: [...AVAILABLE_GEOMETRY.points],
    })

    expect(selectionMetaStore.getState().toolbarGeometry).toEqual(
      AVAILABLE_GEOMETRY,
    )
    expect(notifications).toBe(1)

    unsubscribe()
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

  it('resets selected source and toolbar geometry to defaults', () => {
    selectionMetaActions.setSelectedSource('panel-keyboard')
    selectionMetaActions.setToolbarGeometry(AVAILABLE_GEOMETRY)

    resetSelectionMetaStore()

    expect(selectionMetaStore.getState().selectedSource).toBeNull()
    expect(selectionMetaStore.getState().toolbarGeometry).toEqual(
      INITIAL_SELECTED_TOOLBAR_GEOMETRY,
    )
  })
})
