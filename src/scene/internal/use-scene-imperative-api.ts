import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import type { Object3D } from 'three'
import { buildFurnitureItemsFromInstances } from './furniture-operations'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { createSceneSnapshot } from './scene-snapshot'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'

interface UseSceneImperativeApiOptions {
  camera: Parameters<typeof createSceneSnapshot>[2]
  canvasSize: Parameters<typeof createSceneSnapshot>[3]
  furniture: FurnitureItem[]
  objectRefs: RefObject<Map<string, Object3D>>
}

type GetSnapshot = () => ReturnType<typeof createSceneSnapshot>

export function getMaxRestoredInstanceSuffix(instances: FurnitureInstance[]) {
  return instances.reduce((max, item) => {
    const match = /^furniture-instance-(\d+)$/.exec(item.id)
    const suffix = match ? parseInt(match[1], 10) : 0
    return Math.max(max, suffix)
  }, 0)
}

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

export function useSceneImperativeApi({
  camera,
  canvasSize,
  furniture,
  objectRefs,
}: UseSceneImperativeApiOptions): GetSnapshot {
  const furnitureRef = useRef(furniture)
  const getSnapshotRef = useRef<GetSnapshot>(() =>
    createSceneSnapshot(furniture, objectRefs.current, camera, canvasSize),
  )

  useLayoutEffect(() => {
    furnitureRef.current = furniture
  }, [furniture])

  useLayoutEffect(() => {
    getSnapshotRef.current = () =>
      createSceneSnapshot(
        furnitureRef.current,
        objectRefs.current,
        camera,
        canvasSize,
      )
  }, [camera, canvasSize, objectRefs])

  return useCallback(() => getSnapshotRef.current(), [])
}
