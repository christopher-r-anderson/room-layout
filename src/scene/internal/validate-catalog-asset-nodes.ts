import type { Object3D } from 'three'
import type { FurnitureCatalogEntry } from '../objects/furniture-catalog'

export function validateCatalogAssetNodes({
  catalog,
  sourceScenesByCollectionId,
}: {
  catalog: FurnitureCatalogEntry[]
  sourceScenesByCollectionId: Map<string, Object3D>
}) {
  for (const entry of catalog) {
    const sourceScene = sourceScenesByCollectionId.get(entry.collectionId)

    if (!sourceScene) {
      throw new Error(
        `source scene not loaded for collection: ${entry.collectionId}`,
      )
    }

    const rootNode = sourceScene.getObjectByName(entry.nodeName)
    if (!rootNode) {
      throw new Error(`${entry.nodeName} node not found in GLTF scene`)
    }

    if (!entry.uiBoundsNodeName) {
      continue
    }

    const uiBoundsNodeName = entry.uiBoundsNodeName
    const uiBoundsNode = rootNode.getObjectByName(uiBoundsNodeName)
    if (!uiBoundsNode) {
      throw new Error(
        `${uiBoundsNodeName} ui bounds node not found under ${entry.nodeName}`,
      )
    }

    if (uiBoundsNode === rootNode) {
      throw new Error(
        `${uiBoundsNodeName} ui bounds node must be a descendant of ${entry.nodeName}`,
      )
    }
  }
}
