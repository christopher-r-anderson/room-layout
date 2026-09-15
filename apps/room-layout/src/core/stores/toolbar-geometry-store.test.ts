// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { SelectedToolbarGeometry } from '@/core/scene.types'
import {
  resetToolbarGeometryStore,
  toolbarGeometryActions,
  toolbarGeometryStoreForTests,
} from './toolbar-geometry-store'

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
  resetToolbarGeometryStore()
})

describe('useToolbarGeometryStore', () => {
  it('short-circuits toolbar geometry updates when the value is equal', () => {
    let notifications = 0
    const unsubscribe = toolbarGeometryStoreForTests.subscribe(() => {
      notifications += 1
    })

    toolbarGeometryActions.setToolbarGeometry(AVAILABLE_GEOMETRY)
    toolbarGeometryActions.setToolbarGeometry({
      ...AVAILABLE_GEOMETRY,
      points: [...AVAILABLE_GEOMETRY.points],
    })

    expect(toolbarGeometryStoreForTests.getState().toolbarGeometry).toEqual(
      AVAILABLE_GEOMETRY,
    )
    expect(notifications).toBe(1)

    unsubscribe()
  })

  it('resets toolbar geometry to defaults', () => {
    toolbarGeometryActions.setToolbarGeometry(AVAILABLE_GEOMETRY)

    resetToolbarGeometryStore()

    expect(toolbarGeometryStoreForTests.getState().toolbarGeometry).toEqual(
      toolbarGeometryStoreForTests.getInitialState().toolbarGeometry,
    )
  })
})
