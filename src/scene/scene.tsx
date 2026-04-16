import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { InteractiveFurniture } from './objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Object3D } from 'three'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import { getMeshes } from '@/lib/three/get-meshes'
import {
  getFloorIntersection,
  getDraggedFurniturePosition,
} from '@/lib/three/furniture-drag'
import { findFurnitureSpawnPosition } from '@/lib/three/furniture-spawn'
import {
  resolveMovedFurniturePosition,
  resolveRotatedFurnitureTransform,
  type LayoutBounds,
} from '@/lib/three/furniture-layout'
import type { FurnitureItem } from './objects/furniture.types'
import {
  FURNITURE_COLLECTION_PATHS,
  getFurnitureCatalogEntry,
  getCollectionPath,
} from './objects/furniture-catalog'

const ROOM_HALF_SIZE = 3
const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5
const EDGE_SNAP_THRESHOLD = 0.12
const ROOM_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_SIZE,
  maxX: ROOM_HALF_SIZE,
  minZ: -ROOM_HALF_SIZE,
  maxZ: ROOM_HALF_SIZE,
}

interface DragState {
  id: string
  pointerId: number
  offset: {
    x: number
    z: number
  }
}

export interface SceneRef {
  clearSelection: () => void
  rotateSelection: (deltaRadians: number) => void
  addFurniture: (
    catalogId: string,
  ) =>
    | { ok: true; id: string }
    | { ok: false; reason: 'unknown-catalog' | 'no-space' }
  removeSelection: () => boolean
}

function createFurnitureInstanceId(sequenceNumber: number) {
  return `furniture-instance-${String(sequenceNumber)}`
}

function normalizeAngleRadians(angleRadians: number) {
  const fullTurn = Math.PI * 2
  const normalized = angleRadians % fullTurn

  if (normalized < 0) {
    return normalized + fullTurn
  }

  return normalized
}

function getInitialFurnitureItems(): FurnitureItem[] {
  return []
}

function createFurnitureItem(
  sourceScenesByPath: Map<string, Object3D>,
  id: string,
  catalogId: string,
  overrides?: {
    position?: [number, number, number]
    rotationY?: number
  },
): FurnitureItem {
  const entry = getFurnitureCatalogEntry(catalogId)

  if (!entry) {
    throw new Error(`unknown furniture catalog entry: ${catalogId}`)
  }

  const sourcePath = getCollectionPath(entry.collectionId)
  const sourceScene = sourceScenesByPath.get(sourcePath)

  if (!sourceScene) {
    throw new Error(
      `source scene not loaded for collection: ${entry.collectionId}`,
    )
  }

  const node = sourceScene.getObjectByName(entry.nodeName)

  if (!node) {
    throw new Error(`${entry.nodeName} node not found in GLTF scene`)
  }

  return {
    id,
    catalogId: entry.id,
    name: entry.name,
    kind: entry.kind,
    collectionId: entry.collectionId,
    nodeName: entry.nodeName,
    sourcePath,
    footprintSize: entry.footprintSize,
    position: overrides?.position ?? [
      node.position.x,
      node.position.y,
      node.position.z,
    ],
    rotationY: overrides?.rotationY ?? normalizeAngleRadians(node.rotation.y),
  }
}

export function Scene({
  ref,
  onSelectionChange,
}: {
  ref: React.Ref<SceneRef>
  onSelectionChange?: (item: FurnitureItem | null) => void
}) {
  const gltfResult = useGLTF(FURNITURE_COLLECTION_PATHS) as
    | { scene: Object3D }
    | { scene: Object3D }[]

  const sourceScenesByPath = useMemo(() => {
    const gltfScenes = Array.isArray(gltfResult) ? gltfResult : [gltfResult]

    return new Map<string, Object3D>(
      FURNITURE_COLLECTION_PATHS.map((sourcePath, index) => [
        sourcePath,
        gltfScenes[index].scene,
      ]),
    )
  }, [gltfResult])

  const objectRefs = useRef(new Map<string, Object3D>())
  const [furniture, setFurniture] = useState<FurnitureItem[]>(() =>
    getInitialFurnitureItems(),
  )
  const instanceIdRef = useRef(furniture.length)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const selectedFurniture = useMemo(
    () => furniture.find((item) => item.id === selectedId) ?? null,
    [furniture, selectedId],
  )

  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
  )

  const setSelection = useCallback(
    (item: FurnitureItem | null) => {
      setSelectedId(item?.id ?? null)
      setSelectedObject(item ? (objectRefs.current.get(item.id) ?? null) : null)
      onSelectionChange?.(item)
    },
    [onSelectionChange],
  )

  const selectFurniture = useCallback(
    (id: string | null) => {
      const nextSelection = id
        ? (furniture.find((item) => item.id === id) ?? null)
        : null

      setSelection(nextSelection)
    },
    [furniture, setSelection],
  )

  const handleSelect = useCallback(
    (id: string) => {
      selectFurniture(id)
    },
    [selectFurniture],
  )

  const registerObject = useCallback(
    (id: string, object: Object3D | null) => {
      if (object) {
        objectRefs.current.set(id, object)

        if (selectedId === id) {
          setSelectedObject(object)
        }

        return
      }

      objectRefs.current.delete(id)

      if (selectedId === id) {
        setSelectedObject(null)
      }
    },
    [selectedId],
  )

  const updateFurniturePosition = useCallback(
    (id: string, nextPosition: [number, number, number]) => {
      setFurniture((currentFurniture) =>
        currentFurniture.map((item) => {
          if (item.id !== id) {
            return item
          }

          const [nextX, nextY, nextZ] = nextPosition
          const [currentX, currentY, currentZ] = item.position

          if (currentX === nextX && currentY === nextY && currentZ === nextZ) {
            return item
          }

          return {
            ...item,
            position: nextPosition,
          }
        }),
      )
    },
    [],
  )

  const rotateSelectedFurniture = useCallback(
    (deltaRadians: number) => {
      if (!selectedId) {
        return
      }

      setFurniture((currentFurniture) => {
        const rotatingItem = currentFurniture.find(
          (item) => item.id === selectedId,
        )

        if (!rotatingItem) {
          return currentFurniture
        }

        const resolvedTransform = resolveRotatedFurnitureTransform({
          rotatingId: selectedId,
          proposedRotationY: normalizeAngleRadians(
            rotatingItem.rotationY + deltaRadians,
          ),
          items: currentFurniture,
          bounds: ROOM_BOUNDS,
        })

        if (!resolvedTransform) {
          return currentFurniture
        }

        return currentFurniture.map((item) => {
          if (item.id !== selectedId) {
            return item
          }

          return {
            ...item,
            position: resolvedTransform.position,
            rotationY: resolvedTransform.rotationY,
          }
        })
      })
    },
    [selectedId],
  )

  const handleDragStart = useCallback(
    (id: string, event: ThreeEvent<PointerEvent>) => {
      const activeFurniture = furniture.find((item) => item.id === id)

      if (!activeFurniture) {
        return
      }

      const floorIntersection = getFloorIntersection(event.ray, FLOOR_PLANE_Y)

      if (!floorIntersection) {
        return
      }

      selectFurniture(id)
      setDragState({
        id,
        pointerId: event.pointerId,
        offset: {
          x: activeFurniture.position[0] - floorIntersection.x,
          z: activeFurniture.position[2] - floorIntersection.z,
        },
      })
    },
    [furniture, selectFurniture],
  )

  const handleMove = useCallback(
    (id: string, event: ThreeEvent<PointerEvent>) => {
      if (dragState?.id !== id || dragState.pointerId !== event.pointerId) {
        return
      }

      const activeFurniture = furniture.find((item) => item.id === id)

      if (!activeFurniture) {
        return
      }

      const nextPosition = getDraggedFurniturePosition({
        ray: event.ray,
        currentY: activeFurniture.position[1],
        dragOffset: dragState.offset,
        bounds: ROOM_BOUNDS,
        snapSize: SNAP_SIZE,
        planeY: FLOOR_PLANE_Y,
      })

      if (!nextPosition) {
        return
      }

      const resolvedPosition = resolveMovedFurniturePosition({
        movingId: id,
        proposedPosition: nextPosition,
        items: furniture,
        edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
        bounds: ROOM_BOUNDS,
      })

      if (!resolvedPosition) {
        return
      }

      updateFurniturePosition(id, resolvedPosition)
    },
    [dragState, furniture, updateFurniturePosition],
  )

  const handleDragEnd = useCallback((id: string) => {
    setDragState((currentDragState) => {
      if (currentDragState?.id !== id) {
        return currentDragState
      }

      return null
    })
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      clearSelection: () => {
        if (!dragState) {
          selectFurniture(null)
        }
      },
      rotateSelection: (deltaRadians: number) => {
        rotateSelectedFurniture(deltaRadians)
      },
      addFurniture: (catalogId: string) => {
        const entry = getFurnitureCatalogEntry(catalogId)

        if (!entry) {
          return {
            ok: false,
            reason: 'unknown-catalog' as const,
          }
        }

        const nextId = createFurnitureInstanceId(instanceIdRef.current + 1)
        const nextItem = createFurnitureItem(
          sourceScenesByPath,
          nextId,
          entry.id,
        )
        const spawnPosition = findFurnitureSpawnPosition({
          item: nextItem,
          items: furniture,
          bounds: ROOM_BOUNDS,
          edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
          snapSize: SNAP_SIZE,
        })

        if (!spawnPosition) {
          return {
            ok: false,
            reason: 'no-space' as const,
          }
        }

        const spawnedItem = {
          ...nextItem,
          position: spawnPosition,
        }

        instanceIdRef.current += 1
        setFurniture((currentFurniture) => [...currentFurniture, spawnedItem])
        setSelection(spawnedItem)

        return {
          ok: true,
          id: spawnedItem.id,
        }
      },
      removeSelection: () => {
        if (!selectedFurniture) {
          return false
        }

        setFurniture((currentFurniture) =>
          currentFurniture.filter((item) => item.id !== selectedFurniture.id),
        )
        setDragState((currentDragState) => {
          if (currentDragState?.id !== selectedFurniture.id) {
            return currentDragState
          }

          return null
        })
        selectFurniture(null)

        return true
      },
    }),
    [
      dragState,
      furniture,
      rotateSelectedFurniture,
      selectFurniture,
      selectedFurniture,
      sourceScenesByPath,
      setSelection,
    ],
  )

  const sceneFurniture = useMemo(
    () =>
      furniture.flatMap((item) => {
        const sourceScene = sourceScenesByPath.get(item.sourcePath)

        if (!sourceScene) {
          return []
        }

        return [{ item, sourceScene }]
      }),
    [furniture, sourceScenesByPath],
  )

  return (
    <>
      <EffectComposer autoClear={false}>
        {/* Note: do not use `Selection` is is broken in react 19: https://github.com/pmndrs/react-postprocessing/issues/330 */}
        <Outline
          selection={selection}
          visibleEdgeColor={0xffffff}
          hiddenEdgeColor={0xffffff}
          edgeStrength={3}
        />
      </EffectComposer>
      <CameraControls enabled={!dragState} />
      <Lighting />
      <Room />
      {sceneFurniture.map(({ item, sourceScene }) => (
        <InteractiveFurniture
          key={item.id}
          id={item.id}
          position={item.position}
          rotationY={item.rotationY}
          sourceScene={sourceScene}
          selected={selectedId === item.id}
          onObjectReady={registerObject}
          onSelect={handleSelect}
          onMoveStart={handleDragStart}
          onMove={handleMove}
          onMoveEnd={handleDragEnd}
          nodeName={item.nodeName}
        />
      ))}
    </>
  )
}
