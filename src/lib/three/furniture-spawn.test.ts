import { describe, expect, it } from 'vitest'
import {
  findFurnitureSpawnPosition,
  getFurnitureSpawnCandidates,
} from './furniture-spawn'

const roomBounds = {
  minX: -3,
  maxX: 3,
  minZ: -3,
  maxZ: 3,
}
const snapSize = 0.5

function createFurnitureItem(
  id: string,
  position: [number, number, number],
  overrides: Partial<{
    rotationY: number
    width: number
    depth: number
  }> = {},
) {
  return {
    id,
    catalogId: `${id}-catalog`,
    name: id,
    kind: 'armchair' as const,
    collectionId: 'leather-collection',
    nodeName: id,
    sourcePath: '/models/leather-collection.glb',
    footprintSize: {
      width: overrides.width ?? 1,
      depth: overrides.depth ?? 1,
    },
    position,
    rotationY: overrides.rotationY ?? 0,
  }
}

describe('getFurnitureSpawnCandidates', () => {
  it('returns a deterministic center-first room-wide candidate order', () => {
    const candidates = getFurnitureSpawnCandidates(roomBounds, 0, snapSize)

    expect(candidates).toHaveLength(169)
    expect(candidates[0]).toEqual([0, 0, 0])
    expect(candidates.slice(1, 5)).toEqual([
      [0, 0, -0.5],
      [-0.5, 0, 0],
      [0.5, 0, 0],
      [0, 0, 0.5],
    ])
    expect(candidates).toContainEqual([-3, 0, -3])
    expect(candidates).toContainEqual([3, 0, 3])
  })
})

describe('findFurnitureSpawnPosition', () => {
  it('returns the first valid candidate after rejecting blocked ones', () => {
    const newItem = createFurnitureItem('new', [0, 0, 0])
    const existingItems = [createFurnitureItem('occupied-center', [0, 0, 0])]

    const resolved = findFurnitureSpawnPosition({
      item: newItem,
      items: existingItems,
      bounds: roomBounds,
      edgeSnapThreshold: 0,
      snapSize,
    })

    expect(resolved).not.toBeNull()
    expect(resolved).not.toEqual([0, 0, 0])
  })

  it('keeps searching after the first blocked ring near the center', () => {
    const candidates = getFurnitureSpawnCandidates(roomBounds, 0, snapSize)
    const blockedCandidates = candidates.slice(0, 9)
    const newItem = createFurnitureItem('new', [0, 0, 0])
    const existingItems = blockedCandidates.map((candidate, index) =>
      createFurnitureItem(`occupied-${String(index + 1)}`, candidate),
    )

    const resolved = findFurnitureSpawnPosition({
      item: newItem,
      items: existingItems,
      bounds: roomBounds,
      edgeSnapThreshold: 0,
      snapSize,
    })

    expect(resolved).not.toBeNull()

    if (!resolved) {
      throw new Error('expected a valid spawn position')
    }

    expect(blockedCandidates).not.toContainEqual(resolved)
  })

  it('returns null when the room has no valid placement for the item', () => {
    const newItem = createFurnitureItem('new', [0, 0, 0], {
      width: 6,
      depth: 6,
    })
    const existingItems = [createFurnitureItem('occupied-center', [0, 0, 0])]

    const resolved = findFurnitureSpawnPosition({
      item: newItem,
      items: existingItems,
      bounds: roomBounds,
      edgeSnapThreshold: 0,
      snapSize,
    })

    expect(resolved).toBeNull()
  })
})
