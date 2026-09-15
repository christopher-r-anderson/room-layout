import { afterEach, describe, expect, it } from 'vitest'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  assetsActions,
  useAssetsStore,
  getSourcePathForCatalogId,
  resetAssetsStore,
} from './assets-store'

function entry(id: string, collectionId: string): FurnitureCatalogEntry {
  return {
    id,
    name: `Item ${id}`,
    kind: 'armchair',
    collectionId,
    nodeName: `${id}-node`,
    footprintSize: { width: 1, depth: 1 },
    previewPath: `/previews/${id}.png`,
  }
}

afterEach(() => {
  resetAssetsStore()
})

describe('assets-store', () => {
  it('derives the catalogId -> sourcePath index when the manifest is set', () => {
    assetsActions.setAssets({
      catalog: [entry('chair', 'col-a'), entry('table', 'col-b')],
      collections: [
        { id: 'col-a', sourcePath: '/models/a.glb' },
        { id: 'col-b', sourcePath: '/models/b.glb' },
      ],
      environmentConfig: null,
    })

    expect(getSourcePathForCatalogId('chair')).toBe('/models/a.glb')
    expect(getSourcePathForCatalogId('table')).toBe('/models/b.glb')
  })

  it('omits entries whose collection is missing and returns null for unknown ids', () => {
    assetsActions.setAssets({
      catalog: [entry('chair', 'col-missing')],
      collections: [],
      environmentConfig: null,
    })

    expect(getSourcePathForCatalogId('chair')).toBeNull()
    expect(getSourcePathForCatalogId('nope')).toBeNull()
  })

  it('reset clears the derived index with the manifest', () => {
    assetsActions.setAssets({
      catalog: [entry('chair', 'col-a')],
      collections: [{ id: 'col-a', sourcePath: '/models/a.glb' }],
      environmentConfig: null,
    })

    resetAssetsStore()

    expect(useAssetsStore.getState().sourcePathByCatalogId.size).toBe(0)
  })
})
