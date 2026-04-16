import type { FurnitureKind, FootprintSize } from './furniture.types'

export interface FurnitureCollection {
  id: string
  sourcePath: string
}

export interface FurnitureCatalogEntry {
  id: string
  name: string
  kind: FurnitureKind
  collectionId: FurnitureCollection['id']
  nodeName: string
  footprintSize: FootprintSize
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
    name: 'Leather Couch',
    kind: 'couch',
    collectionId: 'leather-collection',
    nodeName: 'couch',
    footprintSize: {
      width: 2.2,
      depth: 0.95,
    },
  },
  {
    id: 'armchair-1',
    name: 'Leather Armchair',
    kind: 'armchair',
    collectionId: 'leather-collection',
    nodeName: 'armchair',
    footprintSize: {
      width: 1.15,
      depth: 0.95,
    },
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

export function getFurnitureCatalogEntry(catalogId: string) {
  return FURNITURE_CATALOG.find((entry) => entry.id === catalogId) ?? null
}

export function getFurnitureCatalogEntryByKind(kind: FurnitureKind) {
  return FURNITURE_CATALOG.find((entry) => entry.kind === kind) ?? null
}
