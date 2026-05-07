import { describe, expect, it, vi } from 'vitest'

const { clearSpy, preloadSpy } = vi.hoisted(() => ({
  preloadSpy: vi.fn(),
  clearSpy: vi.fn(),
}))

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(vi.fn(), {
    preload: preloadSpy,
    clear: clearSpy,
  }),
}))

import {
  clearFurnitureCollectionCache,
  getCollection,
  preloadFurnitureCollections,
} from './furniture-catalog'
import { resolvePublicAssetPath } from '@/lib/asset-path'
import type { FurnitureCollection } from './furniture-catalog'

const TEST_PATHS = [
  resolvePublicAssetPath('models/leather-collection.glb'),
  resolvePublicAssetPath('models/end-table.glb'),
]

const TEST_COLLECTIONS: FurnitureCollection[] = [
  {
    id: 'leather-collection',
    sourcePath: resolvePublicAssetPath('models/leather-collection.glb'),
  },
  {
    id: 'end-table',
    sourcePath: resolvePublicAssetPath('models/end-table.glb'),
  },
]

describe('resolvePublicAssetPath', () => {
  it('joins the Vite base path with public model paths', () => {
    expect(resolvePublicAssetPath('models/leather-collection.glb')).toBe(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })

  it('avoids double slashes for leading slash asset paths', () => {
    expect(resolvePublicAssetPath('/models/leather-collection.glb')).toBe(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })
})

describe('preloadFurnitureCollections', () => {
  it('calls useGLTF.preload with the given paths array', () => {
    preloadSpy.mockClear()

    preloadFurnitureCollections(TEST_PATHS)

    expect(preloadSpy).toHaveBeenCalledTimes(1)
    expect(preloadSpy.mock.calls).toEqual([[TEST_PATHS]])
  })
})

describe('clearFurnitureCollectionCache', () => {
  it('calls useGLTF.clear once with the full paths array', () => {
    clearSpy.mockClear()

    clearFurnitureCollectionCache(TEST_PATHS)

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(clearSpy.mock.calls[0]).toEqual([TEST_PATHS])
  })
})

describe('getCollection', () => {
  it('returns the matching collection for a known collection id', () => {
    expect(getCollection('end-table', TEST_COLLECTIONS)).toEqual({
      id: 'end-table',
      sourcePath: resolvePublicAssetPath('models/end-table.glb'),
    })
  })

  it('throws for an unknown collection id', () => {
    expect(() => getCollection('unknown', TEST_COLLECTIONS)).toThrow(
      'unknown furniture collection: unknown',
    )
  })
})
