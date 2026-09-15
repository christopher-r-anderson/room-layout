import type { Object3D } from 'three'
import type { FurnitureCatalogEntry } from '@/domain/catalog'

/**
 * Run by the collection loader before the scene is registered, so a violating
 * asset fails its load instead of blowing up later.
 */
export function validateCatalogAssetNodes({
  entries,
  sourceScene,
}: {
  entries: FurnitureCatalogEntry[]
  sourceScene: Object3D
}) {
  for (const entry of entries) {
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
