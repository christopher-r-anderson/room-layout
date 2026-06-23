import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Object3D } from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import { buildFurnitureItemsFromInstances } from './furniture-operations'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { createSceneSnapshot } from './scene-snapshot'
import type { CameraKeyState } from '../scene.types'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'

interface UseSceneImperativeApiOptions {
  camera: Parameters<typeof createSceneSnapshot>[2]
  cameraKeyStateRef: RefObject<CameraKeyState>
  canvasSize: Parameters<typeof createSceneSnapshot>[3]
  cameraControlsRef: RefObject<CameraControlsImpl | null>
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
  cameraKeyStateRef,
  canvasSize,
  cameraControlsRef,
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

  // Apply continuous camera motion based on held-key state.
  useFrame((state, delta) => {
    const controls = cameraControlsRef.current
    if (!controls) {
      return
    }

    const keyState = cameraKeyStateRef.current
    if (keyState.size === 0) {
      return
    }

    const deltaTime = Math.min(delta, 0.05) // Cap delta to prevent large jumps after frame stalls

    // Camera motion constants tuned for the 6x6 meter room scale.
    const ROTATION_SPEED = 1.5 // radians per second
    const TRUCK_SPEED = 3.0 // units per second (pan/strafe)
    const DOLLY_SPEED = 3.0 // units per second (zoom forward/backward)

    const hasShift = keyState.has('shift')

    // Camera controls: WASD for orbit, Shift+WASD for pan
    // Orbit (no shift)
    if (keyState.has('keyW') && !hasShift) {
      void controls.rotate(0, -ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && !hasShift) {
      void controls.rotate(0, ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && !hasShift) {
      void controls.rotate(-ROTATION_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && !hasShift) {
      void controls.rotate(ROTATION_SPEED * deltaTime, 0, false)
    }

    // Pan (Shift+WASD)
    if (keyState.has('keyW') && hasShift) {
      void controls.truck(0, -TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && hasShift) {
      void controls.truck(0, TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && hasShift) {
      void controls.truck(-TRUCK_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && hasShift) {
      void controls.truck(TRUCK_SPEED * deltaTime, 0, false)
    }

    // Zoom/dolly camera with = and - keys
    const hasEqual = keyState.has('equal')
    const hasMinus = keyState.has('minus')
    if (hasEqual || hasMinus) {
      const dollyDistance = hasEqual
        ? DOLLY_SPEED * deltaTime
        : -DOLLY_SPEED * deltaTime
      void controls.dolly(dollyDistance, false)
    }

    state.invalidate()
  })

  return useCallback(() => getSnapshotRef.current(), [])
}
