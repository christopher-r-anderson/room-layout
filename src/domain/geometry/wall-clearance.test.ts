import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/domain/furniture'
import { DEFAULT_ROOM_SIZE, getRoomLayoutBounds } from './room-metrics'
import {
  getWallClearances,
  resolvePositionFromWallClearances,
} from './wall-clearance'

const bounds = getRoomLayoutBounds(DEFAULT_ROOM_SIZE)

function createItem(overrides: Partial<FurnitureItem> = {}): FurnitureItem {
  return {
    id: 'item-1',
    catalogId: 'couch-1',
    name: 'Leather Couch',
    kind: 'couch',
    collectionId: 'leather-collection',
    nodeName: 'couch',
    sourcePath: '/models/leather-collection.glb',
    footprintSize: {
      width: 2.2,
      depth: 0.95,
    },
    position: [0, 0, 0],
    rotationY: 0,
    ...overrides,
  }
}

describe('wall-clearance', () => {
  it('measures wall clearance from the footprint edge rather than the item center', () => {
    const item = createItem()

    expect(getWallClearances(item, bounds)).toEqual({
      left: 1.9,
      back: 2.525,
    })
  })

  it('reports zero clearance when the rotated footprint sits against the left and back walls', () => {
    const item = createItem({
      position: [-2.525, 0, -1.9],
      rotationY: Math.PI / 2,
    })

    const clearances = getWallClearances(item, bounds)

    expect(clearances.left).toBeCloseTo(0)
    expect(clearances.back).toBeCloseTo(0)
  })

  it('resolves a typed left-wall clearance to the correct center position', () => {
    const item = createItem()

    const nextPosition = resolvePositionFromWallClearances(
      item,
      { left: 1.2 },
      bounds,
    )

    expect(nextPosition[0]).toBeCloseTo(-0.7)
    expect(nextPosition[1]).toBe(0)
    expect(nextPosition[2]).toBe(0)
  })

  it('preserves rotation-aware footprint clearance when resolving the back wall distance', () => {
    const item = createItem({ rotationY: Math.PI / 2 })

    const nextPosition = resolvePositionFromWallClearances(
      item,
      { back: 0.25 },
      bounds,
    )
    const clearances = getWallClearances(
      createItem({
        position: nextPosition,
        rotationY: Math.PI / 2,
      }),
      bounds,
    )

    expect(clearances.left).toBeCloseTo(2.525)
    expect(clearances.back).toBeCloseTo(0.25)
  })
})
