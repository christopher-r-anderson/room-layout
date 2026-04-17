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
  FURNITURE_COLLECTION_PATHS,
  preloadFurnitureCollections,
  resolvePublicAssetPath,
} from './furniture-catalog'

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

  it('uses the resolved public path for collection loading', () => {
    expect(FURNITURE_COLLECTION_PATHS).toContain(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })

  it('preloads furniture collections with the same array shape used by scene loading', () => {
    preloadSpy.mockClear()

    preloadFurnitureCollections()

    expect(preloadSpy).toHaveBeenCalledTimes(1)
    expect(preloadSpy.mock.calls).toEqual([[FURNITURE_COLLECTION_PATHS]])
  })

  it('clears cached furniture collections using the same source paths', () => {
    clearSpy.mockClear()

    clearFurnitureCollectionCache()

    expect(clearSpy).toHaveBeenCalledTimes(
      FURNITURE_COLLECTION_PATHS.length + 1,
    )
    expect(clearSpy.mock.calls[0]).toEqual([FURNITURE_COLLECTION_PATHS])
    expect(clearSpy.mock.calls.slice(1)).toEqual(
      FURNITURE_COLLECTION_PATHS.map((sourcePath) => [sourcePath]),
    )
  })
})
