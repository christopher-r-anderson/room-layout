import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { DraggableFurniture } from './objects/draggable-furniture'
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
import type { FurnitureItem } from './objects/furniture.types'
import {
  FURNITURE_CATALOG,
  FURNITURE_COLLECTION_PATHS,
  getCollectionPath,
} from './objects/furniture-catalog'

const ROOM_HALF_SIZE = 3
const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5

interface DragState {
  id: string
  pointerId: number
  offset: {
    x: number
    z: number
  }
}

interface SceneRef {
  clearSelection: () => void
  rotateSelection: (deltaRadians: number) => void
}

function normalizeAngleRadians(angleRadians: number) {
  const fullTurn = Math.PI * 2
  const normalized = angleRadians % fullTurn

  if (normalized < 0) {
    return normalized + fullTurn
  }

  return normalized
}

function getInitialFurnitureItems(
  sourceScenesByPath: Map<string, Object3D>,
): FurnitureItem[] {
  return FURNITURE_CATALOG.map(({ id, kind, collectionId, nodeName }) => {
    const sourcePath = getCollectionPath(collectionId)
    const sourceScene = sourceScenesByPath.get(sourcePath)

    if (!sourceScene) {
      throw new Error(`source scene not loaded for collection: ${collectionId}`)
    }

    const node = sourceScene.getObjectByName(nodeName)

    if (!node) {
      throw new Error(`${nodeName} node not found in GLTF scene`)
    }

    return {
      id,
      kind,
      collectionId,
      nodeName,
      sourcePath,
      position: [node.position.x, node.position.y, node.position.z],
      rotationY: normalizeAngleRadians(node.rotation.y),
    }
  })
}

export function Scene({
  ref,
  onSelectionChange,
}: {
  ref: React.Ref<SceneRef>
  onSelectionChange?: (id: string | null) => void
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
    getInitialFurnitureItems(sourceScenesByPath),
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
  )

  const selectFurniture = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      setSelectedObject(id ? (objectRefs.current.get(id) ?? null) : null)
      onSelectionChange?.(id)
    },
    [onSelectionChange],
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

      setFurniture((currentFurniture) =>
        currentFurniture.map((item) => {
          if (item.id !== selectedId) {
            return item
          }

          return {
            ...item,
            rotationY: normalizeAngleRadians(item.rotationY + deltaRadians),
          }
        }),
      )
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

      setSelectedId(id)
      setSelectedObject(objectRefs.current.get(id) ?? null)
      setDragState({
        id,
        pointerId: event.pointerId,
        offset: {
          x: activeFurniture.position[0] - floorIntersection.x,
          z: activeFurniture.position[2] - floorIntersection.z,
        },
      })
    },
    [furniture],
  )

  const handleDrag = useCallback(
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
        bounds: {
          minX: -ROOM_HALF_SIZE,
          maxX: ROOM_HALF_SIZE,
          minZ: -ROOM_HALF_SIZE,
          maxZ: ROOM_HALF_SIZE,
        },
        snapSize: SNAP_SIZE,
        planeY: FLOOR_PLANE_Y,
      })

      if (!nextPosition) {
        return
      }

      updateFurniturePosition(id, nextPosition)
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
    }),
    [dragState, rotateSelectedFurniture, selectFurniture],
  )

  const draggableFurniture = useMemo(
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
      {draggableFurniture.map(({ item, sourceScene }) => (
        <DraggableFurniture
          key={item.id}
          id={item.id}
          position={item.position}
          rotationY={item.rotationY}
          sourceScene={sourceScene}
          selected={selectedId === item.id}
          onObjectReady={registerObject}
          onSelect={handleSelect}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          nodeName={item.nodeName}
        />
      ))}
    </>
  )
}
