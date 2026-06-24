import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import type { Object3D } from 'three'
import { createSceneSnapshot } from './scene-snapshot'
import type { FurnitureItem } from '@/domain/furniture'

interface UseSceneSnapshotOptions {
  camera: Parameters<typeof createSceneSnapshot>[2]
  canvasSize: Parameters<typeof createSceneSnapshot>[3]
  furniture: FurnitureItem[]
  objectRefs: RefObject<Map<string, Object3D>>
}

type GetSnapshot = () => ReturnType<typeof createSceneSnapshot>

// Returns a stable getter for the current scene snapshot. The snapshot reads the
// latest furniture/objects synchronously via refs so callers (e.g. the URL/draft
// serializers) observe committed state even before passive effects re-run.
export function useSceneSnapshot({
  camera,
  canvasSize,
  furniture,
  objectRefs,
}: UseSceneSnapshotOptions): GetSnapshot {
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
