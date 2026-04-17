import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { InteractiveFurniture } from './objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { type Object3D } from 'three'
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
import {
  commitHistoryPresent,
  createHistoryState,
  finalizeHistoryPresent,
  replaceHistoryPresent,
} from '@/lib/ui/editor-history'
import type { FurnitureItem } from './objects/furniture.types'
import {
  FURNITURE_COLLECTION_PATHS,
  getFurnitureCatalogEntry,
  getCollectionPath,
} from './objects/furniture-catalog'
import {
  getSceneHistoryAvailability,
  redoSceneHistory,
  type SceneHistoryAvailability,
  undoSceneHistory,
} from './scene-history-state'
import { createSceneSnapshot, type SceneSnapshot } from './scene-snapshot'

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
  undo: () => boolean
  redo: () => boolean
  getSnapshot: () => SceneSnapshot
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

function areFurnitureItemsEqual(left: FurnitureItem, right: FurnitureItem) {
  return (
    left.id === right.id &&
    left.catalogId === right.catalogId &&
    left.name === right.name &&
    left.kind === right.kind &&
    left.collectionId === right.collectionId &&
    left.nodeName === right.nodeName &&
    left.sourcePath === right.sourcePath &&
    left.footprintSize.width === right.footprintSize.width &&
    left.footprintSize.depth === right.footprintSize.depth &&
    left.position[0] === right.position[0] &&
    left.position[1] === right.position[1] &&
    left.position[2] === right.position[2] &&
    left.rotationY === right.rotationY
  )
}

function areFurnitureCollectionsEqual(
  left: FurnitureItem[],
  right: FurnitureItem[],
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((item, index) => {
    return areFurnitureItemsEqual(item, right[index])
  })
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
  onHistoryChange,
  onAssetsReady,
}: {
  ref: React.Ref<SceneRef>
  onSelectionChange?: (item: FurnitureItem | null) => void
  onHistoryChange?: (availability: SceneHistoryAvailability) => void
  onAssetsReady?: () => void
}) {
  const camera = useThree((state) => state.camera)
  const canvasSize = useThree((state) => state.size)
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
  const hasReportedAssetsReadyRef = useRef(false)
  const [history, setHistory] = useState(() =>
    createHistoryState<FurnitureItem[]>(getInitialFurnitureItems()),
  )
  const furniture = history.present
  const instanceIdRef = useRef(furniture.length)
  const dragStartStateRef = useRef<FurnitureItem[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const selectedFurniture = useMemo(
    () => furniture.find((item) => item.id === selectedId) ?? null,
    [furniture, selectedId],
  )
  const historyAvailability = useMemo(
    () =>
      getSceneHistoryAvailability({
        history,
        selectedId,
        isDragging: Boolean(dragState),
      }),
    [dragState, history, selectedId],
  )

  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
  )

  useEffect(() => {
    onSelectionChange?.(selectedFurniture)
  }, [onSelectionChange, selectedFurniture])

  useEffect(() => {
    onHistoryChange?.(historyAvailability)
  }, [historyAvailability, onHistoryChange])

  useEffect(() => {
    if (hasReportedAssetsReadyRef.current) {
      return
    }

    hasReportedAssetsReadyRef.current = true
    onAssetsReady?.()
  }, [onAssetsReady, sourceScenesByPath])

  const setSelection = useCallback((item: FurnitureItem | null) => {
    const nextSelectedId = item?.id ?? null

    setSelectedId(nextSelectedId)
    setSelectedObject(
      nextSelectedId ? (objectRefs.current.get(nextSelectedId) ?? null) : null,
    )
  }, [])

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
      setHistory((currentHistory) => {
        const nextFurniture = currentHistory.present.map((item) => {
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
        })

        return replaceHistoryPresent(
          currentHistory,
          nextFurniture,
          areFurnitureCollectionsEqual,
        )
      })
    },
    [],
  )

  const rotateSelectedFurniture = useCallback(
    (deltaRadians: number) => {
      setHistory((currentHistory) => {
        const rotatingId = selectedId

        if (!rotatingId) {
          return currentHistory
        }

        const rotatingItem = currentHistory.present.find(
          (item) => item.id === rotatingId,
        )

        if (!rotatingItem) {
          return currentHistory
        }

        const resolvedTransform = resolveRotatedFurnitureTransform({
          rotatingId,
          proposedRotationY: normalizeAngleRadians(
            rotatingItem.rotationY + deltaRadians,
          ),
          items: currentHistory.present,
          bounds: ROOM_BOUNDS,
        })

        if (!resolvedTransform) {
          return currentHistory
        }

        const nextFurniture = currentHistory.present.map((item) => {
          if (item.id !== rotatingId) {
            return item
          }

          return {
            ...item,
            position: resolvedTransform.position,
            rotationY: resolvedTransform.rotationY,
          }
        })

        return commitHistoryPresent(
          currentHistory,
          nextFurniture,
          areFurnitureCollectionsEqual,
        )
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
      dragStartStateRef.current = furniture
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

  const handleDragEnd = useCallback(
    (id: string) => {
      if (dragState?.id !== id) {
        return
      }

      setDragState(null)

      const dragStartState = dragStartStateRef.current
      dragStartStateRef.current = null

      if (!dragStartState) {
        return
      }

      setHistory((currentHistory) =>
        finalizeHistoryPresent(
          currentHistory,
          dragStartState,
          areFurnitureCollectionsEqual,
        ),
      )
    },
    [dragState],
  )

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

        const addOutcome: {
          result:
            | { ok: true; id: string }
            | { ok: false; reason: 'unknown-catalog' | 'no-space' }
          incrementInstanceId: boolean
        } = {
          result: {
            ok: false,
            reason: 'no-space',
          },
          incrementInstanceId: false,
        }

        setHistory((currentHistory) => {
          const nextId = createFurnitureInstanceId(instanceIdRef.current + 1)
          const nextItem = createFurnitureItem(
            sourceScenesByPath,
            nextId,
            entry.id,
          )
          const spawnPosition = findFurnitureSpawnPosition({
            item: nextItem,
            items: currentHistory.present,
            bounds: ROOM_BOUNDS,
            edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
            snapSize: SNAP_SIZE,
          })

          if (!spawnPosition) {
            return currentHistory
          }

          const spawnedItem = {
            ...nextItem,
            position: spawnPosition,
          }

          addOutcome.result = {
            ok: true,
            id: spawnedItem.id,
          }
          addOutcome.incrementInstanceId = true

          return commitHistoryPresent(
            currentHistory,
            [...currentHistory.present, spawnedItem],
            areFurnitureCollectionsEqual,
          )
        })

        if (addOutcome.incrementInstanceId) {
          instanceIdRef.current += 1
          setSelectedId(addOutcome.result.ok ? addOutcome.result.id : null)
          setSelectedObject(null)
        }

        return addOutcome.result
      },
      removeSelection: () => {
        const removeOutcome = {
          removed: false,
          removedId: null as string | null,
        }

        setHistory((currentHistory) => {
          const currentSelection = selectedId

          if (!currentSelection) {
            return currentHistory
          }

          const nextFurniture = currentHistory.present.filter(
            (item) => item.id !== currentSelection,
          )

          if (nextFurniture.length === currentHistory.present.length) {
            return currentHistory
          }

          removeOutcome.removed = true
          removeOutcome.removedId = currentSelection

          return commitHistoryPresent(
            currentHistory,
            nextFurniture,
            areFurnitureCollectionsEqual,
          )
        })

        if (!removeOutcome.removed) {
          return false
        }

        if (
          removeOutcome.removedId &&
          dragState?.id === removeOutcome.removedId
        ) {
          setDragState(null)
          dragStartStateRef.current = null
        }

        setSelectedId(null)
        setSelectedObject(null)

        return true
      },
      undo: () => {
        const undoResult = undoSceneHistory({
          history,
          selectedId,
          isDragging: Boolean(dragState),
        })

        if (!undoResult.didChange) {
          return false
        }

        setHistory(undoResult.history)
        setSelectedId(undoResult.selectedId)
        setSelectedObject(
          undoResult.selectedId
            ? (objectRefs.current.get(undoResult.selectedId) ?? null)
            : null,
        )

        return true
      },
      redo: () => {
        const redoResult = redoSceneHistory({
          history,
          selectedId,
          isDragging: Boolean(dragState),
        })

        if (!redoResult.didChange) {
          return false
        }

        setHistory(redoResult.history)
        setSelectedId(redoResult.selectedId)
        setSelectedObject(
          redoResult.selectedId
            ? (objectRefs.current.get(redoResult.selectedId) ?? null)
            : null,
        )

        return true
      },
      getSnapshot: (): SceneSnapshot =>
        createSceneSnapshot(
          furniture,
          selectedId,
          objectRefs.current,
          camera,
          canvasSize,
        ),
    }),
    [
      camera,
      canvasSize,
      dragState,
      furniture,
      history,
      rotateSelectedFurniture,
      selectFurniture,
      selectedId,
      sourceScenesByPath,
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
