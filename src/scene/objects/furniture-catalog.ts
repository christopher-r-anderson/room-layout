import { useGLTF } from '@react-three/drei'
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

export function preloadFurnitureCollections(paths: string[]) {
  useGLTF.preload(paths)
}

export function clearFurnitureCollectionCache(paths: string[]) {
  useGLTF.clear(paths)
}

export function getCollection(
  collectionId: string,
  collections: FurnitureCollection[],
) {
  const collection = collections.find((item) => item.id === collectionId)

  if (!collection) {
    throw new Error(`unknown furniture collection: ${collectionId}`)
  }

  return collection
}
