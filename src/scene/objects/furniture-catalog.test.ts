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
  FURNITURE_CATALOG,
  FURNITURE_COLLECTION_PATHS,
  getCollectionPath,
  getFurnitureCatalogEntry,
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
    expect(FURNITURE_COLLECTION_PATHS).toContain(
      `${import.meta.env.BASE_URL}models/end-table.glb`,
    )
    expect(FURNITURE_COLLECTION_PATHS).toContain(
      `${import.meta.env.BASE_URL}models/coffee-table.glb`,
    )
    expect(FURNITURE_COLLECTION_PATHS).toContain(
      `${import.meta.env.BASE_URL}models/coffee-table-living-room.glb`,
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

  it('exposes the new table assets in the furniture catalog', () => {
    expect(FURNITURE_CATALOG.map((entry) => entry.id)).toEqual([
      'couch-1',
      'armchair-1',
      'end-table-1',
      'coffee-table-1',
      'coffee-table-living-room-1',
    ])

    expect(getFurnitureCatalogEntry('end-table-1')).toMatchObject({
      kind: 'end-table',
      collectionId: 'end-table',
      nodeName: 'end-table',
      previewPath: `${import.meta.env.BASE_URL}catalog-previews/end-table.webp`,
      footprintSize: {
        width: 0.96,
        depth: 0.96,
      },
    })

    expect(getFurnitureCatalogEntry('coffee-table-1')).toMatchObject({
      kind: 'coffee-table',
      collectionId: 'coffee-table',
      nodeName: 'coffee-table',
      previewPath: `${import.meta.env.BASE_URL}catalog-previews/coffee-table.webp`,
      footprintSize: {
        width: 1.38,
        depth: 0.855,
      },
    })

    expect(
      getFurnitureCatalogEntry('coffee-table-living-room-1'),
    ).toMatchObject({
      kind: 'coffee-table',
      collectionId: 'coffee-table-living-room',
      nodeName: 'Mesita',
      previewPath: `${import.meta.env.BASE_URL}catalog-previews/living-room-coffee-table.webp`,
      footprintSize: {
        width: 1.91,
        depth: 1.03,
      },
    })
  })

  it('provides preview assets for every catalog entry', () => {
    expect(
      FURNITURE_CATALOG.map((entry) => [entry.id, entry.previewPath]),
    ).toEqual([
      [
        'couch-1',
        `${import.meta.env.BASE_URL}catalog-previews/leather-couch.webp`,
      ],
      [
        'armchair-1',
        `${import.meta.env.BASE_URL}catalog-previews/leather-armchair.webp`,
      ],
      [
        'end-table-1',
        `${import.meta.env.BASE_URL}catalog-previews/end-table.webp`,
      ],
      [
        'coffee-table-1',
        `${import.meta.env.BASE_URL}catalog-previews/coffee-table.webp`,
      ],
      [
        'coffee-table-living-room-1',
        `${import.meta.env.BASE_URL}catalog-previews/living-room-coffee-table.webp`,
      ],
    ])
  })

  it('resolves collection paths for the new standalone models', () => {
    expect(getCollectionPath('end-table')).toBe(
      `${import.meta.env.BASE_URL}models/end-table.glb`,
    )
    expect(getCollectionPath('coffee-table')).toBe(
      `${import.meta.env.BASE_URL}models/coffee-table.glb`,
    )
    expect(getCollectionPath('coffee-table-living-room')).toBe(
      `${import.meta.env.BASE_URL}models/coffee-table-living-room.glb`,
    )
  })
})
