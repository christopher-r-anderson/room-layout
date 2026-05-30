import { getMeshes } from '@/lib/three/get-meshes'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { CameraControls } from './internal/camera/camera-controls'
import { InteractiveFurniture } from './internal/objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CameraControlsImpl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
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
  updateFurniturePositionInHistory,
} from './internal/furniture-operations'
import { validateCatalogAssetNodes } from './internal/validate-catalog-asset-nodes'
import {
  getSceneHistoryAvailability,
  type SceneHistoryAvailability,
} from './internal/scene-history-state'
import type { SceneRef } from './scene.types'
import type { SelectedToolbarGeometry } from './scene.types'
import { useSceneDrag } from './internal/use-scene-drag'
import { useSceneImperativeApi } from './internal/use-scene-imperative-api'
import { useSceneSelection } from './internal/use-scene-selection'
import { BlendFunction } from 'postprocessing'
import {
  ROOM_HALF_DEPTH_METERS,
  ROOM_HALF_WIDTH_METERS,
} from './internal/environment/room-constants'
import { computeSelectedToolbarGeometry } from './internal/selected-toolbar-geometry'

const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5
const EDGE_SNAP_THRESHOLD = 0.12
// These are Three.js render layers used by OutlineEffect selection, not z-order.
const SELECTED_OUTLINE_LAYER = 10
const PREVIEW_OUTLINE_LAYER = 11
const ROOM_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_WIDTH_METERS,
  maxX: ROOM_HALF_WIDTH_METERS,
  minZ: -ROOM_HALF_DEPTH_METERS,
  maxZ: ROOM_HALF_DEPTH_METERS,
}

function getInitialFurnitureItems(): FurnitureItem[] {
  return []
}

export function Scene({
  ref,
  renderQuality = 'default',
  catalog,
  collections,
  onCanvasPointerSelection,
  onSelectionChange,
  onHistoryChange,
  onAssetsReady,
  previewedId = null,
  onPreviewChange,
  onDragStateChange,
  onSelectedToolbarGeometryChange,
  floorOption = null,
  wallOption = null,
  onFloorLoadingChange,
}: {
  ref: React.Ref<SceneRef>
  renderQuality?: 'default' | 'e2e-low'
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  onCanvasPointerSelection?: (id: string) => void
  onSelectionChange?: (item: FurnitureItem | null) => void
  onHistoryChange?: (availability: SceneHistoryAvailability) => void
  onAssetsReady?: () => void
  previewedId?: string | null
  onPreviewChange?: (id: string | null) => void
  onDragStateChange?: (isDragging: boolean) => void
  onSelectedToolbarGeometryChange?: (geometry: SelectedToolbarGeometry) => void
  floorOption?: FloorFinishOption | null
  wallOption?: WallFinishOption | null
  onFloorLoadingChange?: (isLoading: boolean) => void
}) {
  const isE2ELowQuality = renderQuality === 'e2e-low'
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

  const sourceScenesByCollectionId = useMemo(() => {
    const gltfScenes = Array.isArray(gltfResult) ? gltfResult : [gltfResult]

    return new Map<string, Object3D>(
      collections.map((collection, index) => [
        collection.id,
        gltfScenes[index].scene,
      ]),
    )
  }, [collections, gltfResult])

  useMemo(() => {
    if (collectionPaths.length === 0) {
      return
    }

    validateCatalogAssetNodes({
      catalog,
      sourceScenesByCollectionId,
    })
  }, [catalog, collectionPaths.length, sourceScenesByCollectionId])

  const hasReportedAssetsReadyRef = useRef(false)
  const cameraControlsRef = useRef<CameraControlsImpl | null>(null)
  const toolbarGeometryAccumulatorRef = useRef(0)
  const lastToolbarGeometryRef = useRef<SelectedToolbarGeometry | null>(null)
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
      onCanvasPointerSelection?.(id)
      selectFurniture(id)
    },
    [onCanvasPointerSelection, selectFurniture],
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
    // Do not report ready if no collections have been passed yet
    // this happens during the loading-manifest phase when App renders Scene with [] initially.
    if (collectionPaths.length === 0) {
      return
    }

    if (hasReportedAssetsReadyRef.current) {
      return
    }

    hasReportedAssetsReadyRef.current = true
    onAssetsReady?.()
  }, [onAssetsReady, collectionPaths.length, sourceScenesByPath])

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
    cameraControlsRef,
    catalog,
    clearDragState,
    collections,
    dragState,
    edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
    furniture,
    history,
    instanceIdRef,
    objectRefs,
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

  useEffect(() => {
    if (!onSelectedToolbarGeometryChange) {
      return
    }

    const nextGeometry = computeSelectedToolbarGeometry({
      selectedId,
      object: selectedId ? (objectRefs.current.get(selectedId) ?? null) : null,
      camera,
      canvasSize,
    })

    lastToolbarGeometryRef.current = nextGeometry
    onSelectedToolbarGeometryChange(nextGeometry)
  }, [
    camera,
    canvasSize,
    objectRefs,
    onSelectedToolbarGeometryChange,
    selectedId,
  ])

  useFrame((_, delta) => {
    if (!onSelectedToolbarGeometryChange) {
      return
    }

    toolbarGeometryAccumulatorRef.current += delta
    if (toolbarGeometryAccumulatorRef.current < 1 / 24) {
      return
    }

    toolbarGeometryAccumulatorRef.current = 0

    const nextGeometry = computeSelectedToolbarGeometry({
      selectedId,
      object: selectedId ? (objectRefs.current.get(selectedId) ?? null) : null,
      camera,
      canvasSize,
    })

    const previousGeometry = lastToolbarGeometryRef.current
    if (
      previousGeometry &&
      JSON.stringify(previousGeometry) === JSON.stringify(nextGeometry)
    ) {
      return
    }

    lastToolbarGeometryRef.current = nextGeometry
    onSelectedToolbarGeometryChange(nextGeometry)
  })

  return (
    <>
      <EffectComposer autoClear={false} multisampling={isE2ELowQuality ? 0 : 4}>
        {/* Note: do not use `Selection` is is broken in react 19: https://github.com/pmndrs/react-postprocessing/issues/330 */}
        <Outline
          selection={selection}
          selectionLayer={SELECTED_OUTLINE_LAYER}
          blendFunction={BlendFunction.ALPHA}
          visibleEdgeColor={0xf59e0b}
          hiddenEdgeColor={0xb45309}
          edgeStrength={3.2}
          blur={false}
        />
        <Outline
          selection={showPreviewOutline ? previewMeshes : []}
          selectionLayer={PREVIEW_OUTLINE_LAYER}
          blendFunction={BlendFunction.ALPHA}
          visibleEdgeColor={0x60a5fa}
          hiddenEdgeColor={0x2563eb}
          edgeStrength={2.1}
          blur={false}
        />
      </EffectComposer>
      <CameraControls enabled={!dragState} controlsRef={cameraControlsRef} />
      <Lighting lowQuality={isE2ELowQuality} />
      <Room
        receiveShadows={!isE2ELowQuality}
        floorOption={floorOption}
        wallOption={wallOption}
        onFloorLoadingChange={onFloorLoadingChange}
      />
      {sceneFurniture.map(({ item, sourceScene }) => (
        <InteractiveFurniture
          key={item.id}
          id={item.id}
          position={item.position}
          rotationY={item.rotationY}
          sourceScene={sourceScene}
          nodeName={item.nodeName}
          uiBoundsNodeName={item.uiBoundsNodeName}
          selected={selectedId === item.id}
          isDragging={isDragging}
          onObjectReady={registerObject}
          onSelect={handleSelect}
          onMoveStart={handleDragStart}
          onMove={handleMove}
          onMoveEnd={handleDragEnd}
          onPreviewStart={handlePreviewStart}
          onPreviewEnd={handlePreviewEnd}
          enableShadows={!isE2ELowQuality}
        />
      ))}
    </>
  )
}
