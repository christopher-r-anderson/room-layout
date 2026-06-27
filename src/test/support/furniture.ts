import type { FurnitureItem } from '@/domain/furniture'

/**
 * Builds a `FurnitureItem` with a neutral armchair baseline. Pass `overrides`
 * for only the fields a test cares about, so the assertion-relevant values stay
 * front and centre instead of being buried in a full literal.
 */
export function makeFurnitureItem(
  overrides: Partial<FurnitureItem> = {},
): FurnitureItem {
  return {
    id: 'chair-1',
    catalogId: 'chair',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
    ...overrides,
  }
}

/** The baseline armchair, selected via `id: 'chair-1'`. */
export const CHAIR = makeFurnitureItem()

/** A larger couch fixture used by the details panel/view tests. */
export const FURNITURE_ITEM: FurnitureItem = makeFurnitureItem({
  id: 'item-1',
  catalogId: 'couch-1',
  name: 'Leather Couch',
  kind: 'couch',
  collectionId: 'leather-collection',
  nodeName: 'couch',
  sourcePath: '/models/leather-collection.glb',
  footprintSize: { width: 2.2, depth: 0.95 },
})
