import type { Object3D } from 'three'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureInstance } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { buildFurnitureItemsFromInstances } from '../furniture/furniture-operations'

export function getMaxRestoredInstanceSuffix(instances: FurnitureInstance[]) {
  return instances.reduce((max, item) => {
    const match = /^furniture-instance-(\d+)$/.exec(item.id)
    const suffix = match ? parseInt(match[1], 10) : 0
    return Math.max(max, suffix)
  }, 0)
}

// Rebuilds a fresh undo/redo history (and the next instance-id seed) from
// restored furniture instances. Used by the startup restore flow to seed the
// scene without a prior undo timeline.
export function buildRestoredSceneHistory(options: {
  instances: FurnitureInstance[]
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  sourceScenesByPath: Map<string, Object3D>
}) {
  const restoredItems = buildFurnitureItemsFromInstances(
    options.instances,
    options.catalog,
    options.collections,
    options.sourceScenesByPath,
  )

  return {
    restoredItems,
    history: createHistoryState(restoredItems),
    instanceIdSeed: getMaxRestoredInstanceSuffix(options.instances),
  }
}
