import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildRestoredSceneHistory,
  getMaxRestoredInstanceSuffix,
} from './restored-scene-history'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { CollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'

const { mockBuildFurnitureItemsFromInstances } = vi.hoisted(() => ({
  mockBuildFurnitureItemsFromInstances: vi.fn(),
}))

vi.mock('./furniture-operations', () => ({
  buildFurnitureItemsFromInstances: mockBuildFurnitureItemsFromInstances,
  FURNITURE_INSTANCE_ID_PREFIX: 'furniture-instance-',
}))

const EMPTY_CATALOG: FurnitureCatalogEntry[] = []
const EMPTY_COLLECTIONS: FurnitureCollection[] = []
const EMPTY_NODE_DEFAULTS = new Map<
  string,
  Map<string, CollectionNodeDefaults>
>()

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

  it('wraps the rebuilt items in a fresh history seeded by the max instance id', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-3')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [
        makeInstance('furniture-instance-3'),
        makeInstance('furniture-instance-1'),
      ],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      nodeDefaultsByPath: EMPTY_NODE_DEFAULTS,
    })

    expect(restoredState.restoredItems).toBe(restoredItems)
    expect(restoredState.history).toEqual(
      expect.objectContaining({
        past: [],
        present: restoredItems,
        future: [],
      }),
    )
    expect(restoredState.instanceIdSeed).toBe(3)
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
})
