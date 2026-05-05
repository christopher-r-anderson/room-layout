import { useGLTF } from '@react-three/drei'
import { resolvePublicAssetPath } from '@/lib/asset-path'
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
  previewPath: string
}

export const FURNITURE_COLLECTIONS: FurnitureCollection[] = [
  {
    id: 'leather-collection',
    sourcePath: resolvePublicAssetPath('models/leather-collection.glb'),
  },
  {
    id: 'end-table',
    sourcePath: resolvePublicAssetPath('models/end-table.glb'),
  },
  {
    id: 'coffee-table',
    sourcePath: resolvePublicAssetPath('models/coffee-table.glb'),
  },
  {
    id: 'coffee-table-living-room',
    sourcePath: resolvePublicAssetPath('models/coffee-table-living-room.glb'),
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
    previewPath: resolvePublicAssetPath('catalog-previews/leather-couch.webp'),
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
    previewPath: resolvePublicAssetPath(
      'catalog-previews/leather-armchair.webp',
    ),
  },
  {
    id: 'end-table-1',
    name: 'End Table',
    kind: 'end-table',
    collectionId: 'end-table',
    nodeName: 'end-table',
    footprintSize: {
      width: 0.96,
      depth: 0.96,
    },
    previewPath: resolvePublicAssetPath('catalog-previews/end-table.webp'),
  },
  {
    id: 'coffee-table-1',
    name: 'Modern Coffee Table',
    kind: 'coffee-table',
    collectionId: 'coffee-table',
    nodeName: 'coffee-table',
    footprintSize: {
      width: 1.38,
      depth: 0.855,
    },
    previewPath: resolvePublicAssetPath('catalog-previews/coffee-table.webp'),
  },
  {
    id: 'coffee-table-living-room-1',
    name: 'Classic Coffee Table',
    kind: 'coffee-table',
    collectionId: 'coffee-table-living-room',
    nodeName: 'Mesita',
    footprintSize: {
      width: 1.91,
      depth: 1.03,
    },
    previewPath: resolvePublicAssetPath(
      'catalog-previews/living-room-coffee-table.webp',
    ),
  },
]

export const FURNITURE_COLLECTION_PATHS = FURNITURE_COLLECTIONS.map(
  ({ sourcePath }) => sourcePath,
)

export function preloadFurnitureCollections(paths: string[]) {
  useGLTF.preload(paths)
}

export function clearFurnitureCollectionCache(paths: string[]) {
  useGLTF.clear(paths)

  paths.forEach((sourcePath) => {
    useGLTF.clear(sourcePath)
  })
}

export function getCollection(
  collectionId: string,
  collections: FurnitureCollection[] = FURNITURE_COLLECTIONS,
) {
  const collection = collections.find((item) => item.id === collectionId)

  if (!collection) {
    throw new Error(`unknown furniture collection: ${collectionId}`)
  }

  return collection
}

export function getCollectionPath(
  collectionId: string,
  collections: FurnitureCollection[] = FURNITURE_COLLECTIONS,
) {
  return getCollection(collectionId, collections).sourcePath
}

export function getFurnitureCatalogEntry(
  catalogId: string,
  catalog: FurnitureCatalogEntry[] = FURNITURE_CATALOG,
) {
  return catalog.find((entry) => entry.id === catalogId) ?? null
}

export { resolvePublicAssetPath } from '@/lib/asset-path'
