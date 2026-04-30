import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { InteractiveFurniture } from './objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { type Object3D } from 'three'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import { type LayoutBounds } from '@/lib/three/furniture-layout'
import { createHistoryState } from '@/lib/ui/editor-history'
import type { FurnitureItem } from './objects/furniture.types'
import { FURNITURE_COLLECTION_PATHS } from './objects/furniture-catalog'
import {
  areFurnitureCollectionsEqual,
  rotateSelectedFurnitureInHistory,
  updateFurniturePositionInHistory,
} from './furniture-operations'
import {
  getSceneHistoryAvailability,
  type SceneHistoryAvailability,
} from './scene-history-state'
import type { SceneRef } from './scene.types'
import { useSceneDrag } from './use-scene-drag'
import { useSceneImperativeApi } from './use-scene-imperative-api'
import { useSceneSelection } from './use-scene-selection'

interface SceneOutlinerItem {
  id: string
  name: string
}

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

function getInitialFurnitureItems(): FurnitureItem[] {
  return []
}

export function Scene({
  ref,
  onSelectionChange,
  onHistoryChange,
  onAssetsReady,
  onFurnitureChange,
}: {
  ref: React.Ref<SceneRef>
  onSelectionChange?: (item: FurnitureItem | null) => void
  onHistoryChange?: (availability: SceneHistoryAvailability) => void
  onAssetsReady?: () => void
  onFurnitureChange?: (items: SceneOutlinerItem[]) => void
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

  const hasReportedAssetsReadyRef = useRef(false)
  const [history, setHistory] = useState(() =>
    createHistoryState<FurnitureItem[]>(getInitialFurnitureItems()),
  )
  const furniture = history.present
  const instanceIdRef = useRef(furniture.length)
  const {
    objectRefs,
    registerObject,
    selectFurniture,
    selectedId,
    selection,
    setSelectedIdAndResolveObject,
  } = useSceneSelection({
    furniture,
    onSelectionChange,
  })

  const handleSelect = useCallback(
    (id: string) => {
      selectFurniture(id)
    },
    [selectFurniture],
  )

  const updateFurniturePosition = useCallback(
    (id: string, nextPosition: [number, number, number]) => {
      setHistory((currentHistory) => {
        return updateFurniturePositionInHistory(
          currentHistory,
          id,
          nextPosition,
        )
      })
    },
    [],
  )

  const rotateSelectedFurniture = useCallback(
    (deltaRadians: number) => {
      setHistory((currentHistory) => {
        return rotateSelectedFurnitureInHistory({
          history: currentHistory,
          selectedId,
          deltaRadians,
          bounds: ROOM_BOUNDS,
        })
      })
    },
    [selectedId],
  )
  const {
    clearDragState,
    dragState,
    handleDragEnd,
    handleDragStart,
    handleMove,
  } = useSceneDrag({
    furniture,
    selectFurniture,
    updateFurniturePosition,
    setHistory,
    bounds: ROOM_BOUNDS,
    floorPlaneY: FLOOR_PLANE_Y,
    snapSize: SNAP_SIZE,
    edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
    areFurnitureCollectionsEqual,
  })

  const historyAvailability = useMemo(
    () =>
      getSceneHistoryAvailability({
        history,
        selectedId,
        isDragging: Boolean(dragState),
      }),
    [dragState, history, selectedId],
  )

  useEffect(() => {
    onHistoryChange?.(historyAvailability)
  }, [historyAvailability, onHistoryChange])

  const prevOutlinerKeyRef = useRef<string>('')

  useEffect(() => {
    const key = furniture.map(({ id, name }) => `${id}:${name}`).join(',')
    if (key === prevOutlinerKeyRef.current) return
    prevOutlinerKeyRef.current = key
    onFurnitureChange?.(furniture.map(({ id, name }) => ({ id, name })))
  }, [furniture, onFurnitureChange])

  useEffect(() => {
    if (hasReportedAssetsReadyRef.current) {
      return
    }

    hasReportedAssetsReadyRef.current = true
    onAssetsReady?.()
  }, [onAssetsReady, sourceScenesByPath])

  useSceneImperativeApi({
    ref,
    bounds: ROOM_BOUNDS,
    camera,
    canvasSize,
    clearDragState,
    dragState,
    edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
    furniture,
    history,
    instanceIdRef,
    objectRefs,
    rotateSelectedFurniture,
    selectFurniture,
    selectedId,
    setHistory,
    setSelectedIdAndResolveObject,
    snapSize: SNAP_SIZE,
    sourceScenesByPath,
  })

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
