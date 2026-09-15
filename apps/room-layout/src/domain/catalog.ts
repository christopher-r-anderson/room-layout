import type { FurnitureKind, FootprintSize } from './furniture'

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
  uiBoundsNodeName?: string
  footprintSize: FootprintSize
  previewPath: string
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
