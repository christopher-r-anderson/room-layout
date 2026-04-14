import type { FurnitureKind } from './furniture.types'

export interface FurnitureCollection {
  id: string
  sourcePath: string
}

export interface FurnitureCatalogEntry {
  id: string
  kind: FurnitureKind
  collectionId: FurnitureCollection['id']
  nodeName: string
}

export const FURNITURE_COLLECTIONS: FurnitureCollection[] = [
  {
    id: 'leather-collection',
    sourcePath: '/models/leather-collection.glb',
  },
]

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  {
    id: 'couch-1',
    kind: 'couch',
    collectionId: 'leather-collection',
    nodeName: 'couch',
  },
  {
    id: 'armchair-1',
    kind: 'armchair',
    collectionId: 'leather-collection',
    nodeName: 'armchair',
  },
]

export const FURNITURE_COLLECTION_PATHS = FURNITURE_COLLECTIONS.map(
  ({ sourcePath }) => sourcePath,
)

export function getCollectionPath(collectionId: string) {
  const collection = FURNITURE_COLLECTIONS.find(
    (item) => item.id === collectionId,
  )

  if (!collection) {
    throw new Error(`unknown furniture collection: ${collectionId}`)
  }

  return collection.sourcePath
}
