import type { FurnitureItem } from '@/domain/furniture'

export const FURNITURE_ITEM: FurnitureItem = {
  id: 'item-1',
  catalogId: 'couch-1',
  name: 'Leather Couch',
  kind: 'couch',
  collectionId: 'leather-collection',
  nodeName: 'couch',
  sourcePath: '/models/leather-collection.glb',
  footprintSize: {
    width: 2.2,
    depth: 0.95,
  },
  position: [0, 0, 0],
  rotationY: 0,
}
