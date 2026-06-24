import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Object3D } from 'three'
import {
  buildRestoredSceneHistory,
  getMaxRestoredInstanceSuffix,
} from './restored-scene-history'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'

const { mockBuildFurnitureItemsFromInstances } = vi.hoisted(() => ({
  mockBuildFurnitureItemsFromInstances: vi.fn(),
}))

vi.mock('../furniture/furniture-operations', () => ({
  buildFurnitureItemsFromInstances: mockBuildFurnitureItemsFromInstances,
}))

const EMPTY_CATALOG: FurnitureCatalogEntry[] = []
const EMPTY_COLLECTIONS: FurnitureCollection[] = []
const EMPTY_SOURCE_SCENES = new Map<string, Object3D>()

function makeInstance(
  id: string,
  overrides?: Partial<FurnitureInstance>,
): FurnitureInstance {
  return {
    id,
    catalogId: 'catalog-chair',
    position: [0, 0, 0],
    rotationY: 0,
    ...overrides,
  }
}

function makeFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

describe('buildRestoredSceneHistory', () => {
  beforeEach(() => {
    mockBuildFurnitureItemsFromInstances.mockReset()
    mockBuildFurnitureItemsFromInstances.mockReturnValue([])
  })

  it('seeds the scene with reconstructed furniture items', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-1')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.restoredItems).toEqual(restoredItems)
    expect(restoredState.history.present).toEqual(restoredItems)
  })

  it('establishes empty undo/redo history baseline', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-2')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-2')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.history).toEqual(
      expect.objectContaining({
        past: [],
        present: restoredItems,
        future: [],
      }),
    )
  })

  it('reseeds instanceIdRef to max restored suffix', () => {
    expect(
      getMaxRestoredInstanceSuffix([
        makeInstance('furniture-instance-5'),
        makeInstance('furniture-instance-3'),
      ]),
    ).toBe(5)
  })

  it('handles instances with non-standard id format gracefully', () => {
    expect(getMaxRestoredInstanceSuffix([makeInstance('custom-id')])).toBe(0)
  })

  it('tracks the instance id seed from the restored instances', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-1')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.instanceIdSeed).toBe(1)
  })

  it('propagates errors from buildFurnitureItemsFromInstances', () => {
    mockBuildFurnitureItemsFromInstances.mockImplementation(() => {
      throw new Error('node not found')
    })

    expect(() => {
      buildRestoredSceneHistory({
        instances: [makeInstance('furniture-instance-1')],
        catalog: EMPTY_CATALOG,
        collections: EMPTY_COLLECTIONS,
        sourceScenesByPath: EMPTY_SOURCE_SCENES,
      })
    }).toThrow('node not found')
  })
})
