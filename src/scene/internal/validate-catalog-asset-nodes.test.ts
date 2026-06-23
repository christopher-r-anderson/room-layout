import { describe, expect, it } from 'vitest'
import { Group, Mesh } from 'three'
import { validateCatalogAssetNodes } from './validate-catalog-asset-nodes'
import type { FurnitureCatalogEntry } from '@/domain/catalog'

function createCatalogEntry(
  overrides: Partial<FurnitureCatalogEntry> = {},
): FurnitureCatalogEntry {
  return {
    id: 'chair-1',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairRoot',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/previews/chair.webp',
    ...overrides,
  }
}

describe('validateCatalogAssetNodes', () => {
  it('accepts a catalog entry when root and optional ui bounds exist', () => {
    const sourceScene = new Group()
    const root = new Group()
    root.name = 'ChairRoot'
    const uiBounds = new Mesh()
    uiBounds.name = 'Chair_UIBounds'
    root.add(uiBounds)
    sourceScene.add(root)

    expect(() => {
      validateCatalogAssetNodes({
        catalog: [createCatalogEntry({ uiBoundsNodeName: 'Chair_UIBounds' })],
        sourceScenesByCollectionId: new Map([['collection-1', sourceScene]]),
      })
    }).not.toThrow()
  })

  it('throws when the root node is missing', () => {
    expect(() => {
      validateCatalogAssetNodes({
        catalog: [createCatalogEntry()],
        sourceScenesByCollectionId: new Map([['collection-1', new Group()]]),
      })
    }).toThrow('ChairRoot node not found in GLTF scene')
  })

  it('throws when a provided ui bounds node is missing', () => {
    const sourceScene = new Group()
    const root = new Group()
    root.name = 'ChairRoot'
    sourceScene.add(root)

    expect(() => {
      validateCatalogAssetNodes({
        catalog: [createCatalogEntry({ uiBoundsNodeName: 'Chair_UIBounds' })],
        sourceScenesByCollectionId: new Map([['collection-1', sourceScene]]),
      })
    }).toThrow('Chair_UIBounds ui bounds node not found under ChairRoot')
  })

  it('throws when a ui bounds node exists outside the catalog root subtree', () => {
    const sourceScene = new Group()
    const root = new Group()
    root.name = 'ChairRoot'
    const strayUiBounds = new Mesh()
    strayUiBounds.name = 'Chair_UIBounds'
    sourceScene.add(root, strayUiBounds)

    expect(() => {
      validateCatalogAssetNodes({
        catalog: [createCatalogEntry({ uiBoundsNodeName: 'Chair_UIBounds' })],
        sourceScenesByCollectionId: new Map([['collection-1', sourceScene]]),
      })
    }).toThrow('Chair_UIBounds ui bounds node not found under ChairRoot')
  })

  it('throws when a ui bounds node points at the catalog root itself', () => {
    const sourceScene = new Group()
    const root = new Group()
    root.name = 'ChairRoot'
    sourceScene.add(root)

    expect(() => {
      validateCatalogAssetNodes({
        catalog: [createCatalogEntry({ uiBoundsNodeName: 'ChairRoot' })],
        sourceScenesByCollectionId: new Map([['collection-1', sourceScene]]),
      })
    }).toThrow('ChairRoot ui bounds node must be a descendant of ChairRoot')
  })
})
