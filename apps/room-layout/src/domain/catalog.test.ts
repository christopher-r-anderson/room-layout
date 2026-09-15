import { describe, expect, it } from 'vitest'
import { getCollection, type FurnitureCollection } from './catalog'

const TEST_COLLECTIONS: FurnitureCollection[] = [
  { id: 'leather-collection', sourcePath: '/models/leather-collection.glb' },
  { id: 'end-table', sourcePath: '/models/end-table.glb' },
]

describe('getCollection', () => {
  it('returns the matching collection for a known collection id', () => {
    expect(getCollection('end-table', TEST_COLLECTIONS)).toEqual({
      id: 'end-table',
      sourcePath: '/models/end-table.glb',
    })
  })

  it('throws for an unknown collection id', () => {
    expect(() => getCollection('unknown', TEST_COLLECTIONS)).toThrow(
      'unknown furniture collection: unknown',
    )
  })
})
