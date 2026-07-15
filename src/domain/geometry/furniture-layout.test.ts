import { describe, expect, it } from 'vitest'
import {
  clampItemsToLayoutBounds,
  getOutOfBoundsItemIds,
  resolveAbsoluteFurnitureTransform,
  resolveMovedFurniturePosition,
  resolveRotatedFurnitureTransform,
} from './furniture-layout'

const roomBounds = {
  minX: -3,
  maxX: 3,
  minZ: -3,
  maxZ: 3,
}

const baseItems = [
  {
    id: 'moving',
    position: [0, 0, 0] as [number, number, number],
    rotationY: 0,
    footprintSize: {
      width: 2,
      depth: 1,
    },
  },
  {
    id: 'target',
    position: [2.1, 0, 0] as [number, number, number],
    rotationY: 0,
    footprintSize: {
      width: 2,
      depth: 1,
    },
  },
]

describe('resolveMovedFurniturePosition', () => {
  it('returns clamped position when no overlap or snap candidate exists', () => {
    const nonOverlappingItems = [
      baseItems[0],
      {
        ...baseItems[1],
        position: [2.6, 0, 0] as [number, number, number],
      },
    ]

    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [0.2, 0, 0.3],
      items: nonOverlappingItems,
      edgeSnapThreshold: 0.05,
      bounds: roomBounds,
    })

    expect(resolved).toEqual([0.2, 0, 0.3])
  })

  it('clamps against room bounds using footprint edges, not pivot center', () => {
    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [2.6, 0, 0],
      items: [baseItems[0]],
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).toEqual([2, 0, 0])
  })

  it('blocks movement that would overlap another item', () => {
    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [1.4, 0, 0],
      items: baseItems,
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).toBeNull()
  })

  it('resolves a near-collision drag to the last safe edge contact', () => {
    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [0.05, 0, 0],
      items: baseItems,
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.[0]).toBeCloseTo(0.1)
    expect(resolved?.[1]).toBeCloseTo(0)
    expect(resolved?.[2]).toBeCloseTo(0)
  })

  it('blocks the next drag step after reaching the last safe edge contact', () => {
    const contactItems = [
      {
        ...baseItems[0],
        position: [0.1, 0, 0] as [number, number, number],
      },
      baseItems[1],
    ]

    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [0.2, 0, 0],
      items: contactItems,
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).toBeNull()
  })

  it('snaps to nearest edge when candidate is near and valid', () => {
    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [0.05, 0, 0],
      items: baseItems,
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.[0]).toBeCloseTo(0.1)
    expect(resolved?.[2]).toBeCloseTo(0)
  })

  it('snaps to nearby room wall when within threshold', () => {
    const resolved = resolveMovedFurniturePosition({
      movingId: 'moving',
      proposedPosition: [1.92, 0, 0],
      items: [baseItems[0]],
      edgeSnapThreshold: 0.1,
      bounds: roomBounds,
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.[0]).toBeCloseTo(2)
    expect(resolved?.[2]).toBeCloseTo(0)
  })
})

describe('resolveRotatedFurnitureTransform', () => {
  it('returns null when rotation would cause overlap', () => {
    const items = [
      {
        id: 'moving',
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
        footprintSize: {
          width: 1,
          depth: 2,
        },
      },
      {
        id: 'target',
        position: [1.1, 0, 0] as [number, number, number],
        rotationY: 0,
        footprintSize: {
          width: 1,
          depth: 2,
        },
      },
    ]

    const resolved = resolveRotatedFurnitureTransform({
      rotatingId: 'moving',
      proposedRotationY: Math.PI / 2,
      items,
      bounds: roomBounds,
    })

    expect(resolved).toBeNull()
  })

  it('clamps position when rotated footprint would exceed room bounds', () => {
    const items = [
      {
        id: 'moving',
        position: [2.3, 0, 0] as [number, number, number],
        rotationY: 0,
        footprintSize: {
          width: 1,
          depth: 2,
        },
      },
    ]

    const resolved = resolveRotatedFurnitureTransform({
      rotatingId: 'moving',
      proposedRotationY: Math.PI / 2,
      items,
      bounds: roomBounds,
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.rotationY).toBeCloseTo(Math.PI / 2)
    expect(resolved?.position).toEqual([2, 0, 0])
  })

  it('returns the proposed transform unchanged when no overlap and no clamping needed', () => {
    const items = [
      {
        id: 'moving',
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
        footprintSize: {
          width: 1,
          depth: 1,
        },
      },
    ]

    const resolved = resolveRotatedFurnitureTransform({
      rotatingId: 'moving',
      proposedRotationY: Math.PI / 4,
      items,
      bounds: roomBounds,
    })

    expect(resolved).not.toBeNull()
    expect(resolved?.rotationY).toBeCloseTo(Math.PI / 4)
    expect(resolved?.position).toEqual([0, 0, 0])
  })
})

describe('resolveAbsoluteFurnitureTransform', () => {
  it('returns the exact proposed transform when it is valid', () => {
    const resolved = resolveAbsoluteFurnitureTransform({
      movingId: 'moving',
      proposedPosition: [0.6, 0, 0.4],
      proposedRotationY: Math.PI / 4,
      items: [baseItems[0]],
      bounds: roomBounds,
    })

    expect(resolved).toEqual({
      ok: true,
      position: [0.6, 0, 0.4],
      rotationY: Math.PI / 4,
    })
  })

  it('rejects transforms that would need bounds clamping', () => {
    const resolved = resolveAbsoluteFurnitureTransform({
      movingId: 'moving',
      proposedPosition: [2.6, 0, 0],
      proposedRotationY: 0,
      items: [baseItems[0]],
      bounds: roomBounds,
    })

    expect(resolved).toEqual({
      ok: false,
      reason: 'blocked-bounds',
    })
  })

  it('rejects transforms that would overlap another item', () => {
    const resolved = resolveAbsoluteFurnitureTransform({
      movingId: 'moving',
      proposedPosition: [1.4, 0, 0],
      proposedRotationY: 0,
      items: baseItems,
      bounds: roomBounds,
    })

    expect(resolved).toEqual({
      ok: false,
      reason: 'blocked-collision',
    })
  })
})

// baseItems' 'target' footprint intentionally pokes past the wall; the
// bounds-fitting cases below need items that genuinely fit.
const fittingItems = [
  baseItems[0],
  {
    ...baseItems[1],
    position: [1.8, 0, 0] as [number, number, number],
  },
]

describe('getOutOfBoundsItemIds', () => {
  it('returns no ids when every footprint fits inside the bounds', () => {
    expect(getOutOfBoundsItemIds(fittingItems, roomBounds)).toEqual([])
  })

  it('flags items whose footprint crosses a wall', () => {
    const items = [
      baseItems[0],
      {
        ...baseItems[1],
        id: 'outside',
        position: [2.5, 0, 0] as [number, number, number],
      },
    ]

    expect(getOutOfBoundsItemIds(items, roomBounds)).toEqual(['outside'])
  })

  it('tolerates the sub-millimeter excursion left by serialization rounding', () => {
    // footprint maxX = 3.0005: past the wall by exactly the roundTo3 error.
    const items = [
      {
        ...baseItems[0],
        position: [2.0005, 0, 0] as [number, number, number],
      },
    ]

    expect(getOutOfBoundsItemIds(items, roomBounds)).toEqual([])
  })
})

describe('clampItemsToLayoutBounds', () => {
  it('returns the input array identity when nothing moves', () => {
    const result = clampItemsToLayoutBounds(fittingItems, roomBounds)

    expect(result.items).toBe(fittingItems)
    expect(result.movedCount).toBe(0)
  })

  it('pulls out-of-bounds items flush to the wall and counts them', () => {
    const items = [
      baseItems[0],
      {
        ...baseItems[1],
        id: 'outside',
        position: [4, 0, 0] as [number, number, number],
      },
    ]

    const result = clampItemsToLayoutBounds(items, roomBounds)

    expect(result.movedCount).toBe(1)
    expect(result.items[0]).toBe(items[0])
    expect(result.items[1].position).toEqual([2, 0, 0])
  })

  it('centers a footprint larger than the room on the exceeded axis', () => {
    const items = [
      {
        ...baseItems[0],
        footprintSize: { width: 8, depth: 1 },
        position: [1.5, 0, 0] as [number, number, number],
      },
    ]

    const result = clampItemsToLayoutBounds(items, roomBounds)

    expect(result.movedCount).toBe(1)
    expect(result.items[0].position).toEqual([0, 0, 0])
  })

  it('keeps identity for an oversized footprint that is already centered', () => {
    // Still flagged out of bounds, but no closer position exists; a repeat
    // pull must not report movement or produce fresh objects.
    const items = [
      {
        ...baseItems[0],
        footprintSize: { width: 8, depth: 1 },
        position: [0, 0, 0] as [number, number, number],
      },
    ]

    const result = clampItemsToLayoutBounds(items, roomBounds)

    expect(result.movedCount).toBe(0)
    expect(result.items).toBe(items)
  })
})
