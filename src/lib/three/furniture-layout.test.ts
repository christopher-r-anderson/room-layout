import { describe, expect, it } from 'vitest'
import {
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
})
