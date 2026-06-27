import { beforeEach, describe, expect, it } from 'vitest'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  catalogSelectionActions,
  getActiveCatalogId,
  resetCatalogSelectionStore,
} from './catalog-selection-store'

function entry(id: string): FurnitureCatalogEntry {
  return {
    id,
    name: id,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'Node',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/previews/chair.webp',
  }
}

function loadCatalog(ids: string[]) {
  assetsActions.setAssets({
    catalog: ids.map(entry),
    collections: [],
    environmentConfig: null,
  })
}

describe('getActiveCatalogId', () => {
  beforeEach(() => {
    resetCatalogSelectionStore()
    resetAssetsStore()
  })

  it('returns the stored selection when it is still in the catalog', () => {
    loadCatalog(['a', 'b'])
    catalogSelectionActions.setSelectedCatalogId('b')

    expect(getActiveCatalogId()).toBe('b')
  })

  it('falls back to the first entry when the stored selection is stale', () => {
    loadCatalog(['a', 'b'])
    catalogSelectionActions.setSelectedCatalogId('removed')

    expect(getActiveCatalogId()).toBe('a')
  })

  it('falls back to the first entry when nothing is selected', () => {
    loadCatalog(['a', 'b'])

    expect(getActiveCatalogId()).toBe('a')
  })

  it('returns an empty string when the catalog is empty', () => {
    expect(getActiveCatalogId()).toBe('')
  })
})
