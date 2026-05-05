import { getMeshes } from '@/lib/three/get-meshes'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import { CameraControls } from './internal/camera/camera-controls'
import { InteractiveFurniture } from './internal/objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { type Object3D } from 'three'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import { type LayoutBounds } from '@/lib/three/furniture-layout'
import { createHistoryState } from '@/lib/ui/editor-history'
import type { FurnitureItem } from './objects/furniture.types'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from './objects/furniture-catalog'
import {
  areFurnitureCollectionsEqual,
  rotateSelectedFurnitureInHistory,
  updateFurniturePositionInHistory,
} from './internal/furniture-operations'
import {
  getSceneHistoryAvailability,
  type SceneHistoryAvailability,
} from './internal/scene-history-state'
import type { SceneRef } from './scene.types'
import { useSceneDrag } from './internal/use-scene-drag'
import { useSceneImperativeApi } from './internal/use-scene-imperative-api'
import { useSceneSelection } from './internal/use-scene-selection'

const ROOM_HALF_SIZE = 3
const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5
const EDGE_SNAP_THRESHOLD = 0.12
// These are Three.js render layers used by OutlineEffect selection, not z-order.
const SELECTED_OUTLINE_LAYER = 10
const PREVIEW_OUTLINE_LAYER = 11
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
  catalog,
  collections,
  onSelectionChange,
  onHistoryChange,
  onAssetsReady,
  previewedId = null,
  onPreviewChange,
  onDragStateChange,
}: {
  ref: React.Ref<SceneRef>
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  onSelectionChange?: (item: FurnitureItem | null) => void
  onHistoryChange?: (availability: SceneHistoryAvailability) => void
  onAssetsReady?: () => void
  previewedId?: string | null
  onPreviewChange?: (id: string | null) => void
  onDragStateChange?: (isDragging: boolean) => void
}) {
  const camera = useThree((state) => state.camera)
  const canvasSize = useThree((state) => state.size)
  const collectionPaths = useMemo(
    () => collections.map((c) => c.sourcePath),
    [collections],
  )
  const gltfResult = useGLTF(collectionPaths) as
    | { scene: Object3D }
    | { scene: Object3D }[]

  const sourceScenesByPath = useMemo(() => {
    const gltfScenes = Array.isArray(gltfResult) ? gltfResult : [gltfResult]

    return new Map<string, Object3D>(
      collectionPaths.map((sourcePath, index) => [
        sourcePath,
        gltfScenes[index].scene,
      ]),
    )
  }, [gltfResult, collectionPaths])

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

  const isDragging = Boolean(dragState)

  useEffect(() => {
    onDragStateChange?.(isDragging)
  }, [isDragging, onDragStateChange])

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

  const handlePreviewStart = useCallback(
    (id: string) => {
      if (id === selectedId) {
        return
      }

      onPreviewChange?.(id)
    },
    [onPreviewChange, selectedId],
  )

  const handlePreviewEnd = useCallback(() => {
    onPreviewChange?.(null)
  }, [onPreviewChange])

  useSceneImperativeApi({
    ref,
    bounds: ROOM_BOUNDS,
    camera,
    canvasSize,
    catalog,
    clearDragState,
    collections,
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

  const previewObject = useMemo(
    () =>
      previewedId !== null
        ? (objectRefs.current.get(previewedId) ?? null)
        : null,
    // objectRefs.current is ref-backed and does not trigger memo updates;
    // furniture identity changes whenever scene objects are re-registered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewedId, furniture],
  )

  const previewMeshes = useMemo(
    () => (previewObject ? getMeshes(previewObject) : []),
    [previewObject],
  )

  const showPreviewOutline =
    previewedId !== null &&
    previewedId !== selectedId &&
    previewMeshes.length > 0

  return (
    <>
      <EffectComposer autoClear={false}>
        {/* Note: do not use `Selection` is is broken in react 19: https://github.com/pmndrs/react-postprocessing/issues/330 */}
        <Outline
          selection={selection}
          selectionLayer={SELECTED_OUTLINE_LAYER}
          visibleEdgeColor={0xffffff}
          hiddenEdgeColor={0xffffff}
          edgeStrength={3}
        />
        <Outline
          selection={showPreviewOutline ? previewMeshes : []}
          selectionLayer={PREVIEW_OUTLINE_LAYER}
          visibleEdgeColor={0xaaaaaa}
          hiddenEdgeColor={0xaaaaaa}
          edgeStrength={1.5}
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
          isDragging={isDragging}
          onObjectReady={registerObject}
          onSelect={handleSelect}
          onMoveStart={handleDragStart}
          onMove={handleMove}
          onMoveEnd={handleDragEnd}
          onPreviewStart={handlePreviewStart}
          onPreviewEnd={handlePreviewEnd}
          nodeName={item.nodeName}
        />
      ))}
    </>
  )
}
