import { getMeshes } from '@/scene/internal/three/get-meshes'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { CameraControls } from './internal/camera/camera-controls'
import { InteractiveFurniture } from './internal/furniture/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { type Object3D } from 'three'
import { SelectionOutlineEffect } from './internal/selection/selection-outline-effect'
import { type LayoutBounds } from '@/domain/geometry/furniture-layout'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import {
  areFurnitureCollectionsEqual,
  updateFurniturePositionInHistory,
} from './internal/furniture/furniture-operations'
import { validateCatalogAssetNodes } from './internal/validate-catalog-asset-nodes'
import { useHistoryOperations } from './internal/history/use-history-operations'
import type { CameraKeyState } from './scene.types'
import { useSceneDrag } from './internal/drag/use-scene-drag'
import { useSceneSnapshot } from './internal/snapshot/use-scene-snapshot'
import { useCameraOperations } from './internal/camera/use-camera-operations'
import { useCameraKeyMotion } from './internal/camera/use-camera-key-motion'
import { useSelectionOperations } from './internal/selection/use-selection-operations'
import { useFurnitureOperations } from './internal/furniture/use-furniture-operations'
import { useSceneSelection } from './internal/selection/use-scene-selection'
import {
  ROOM_HALF_DEPTH_METERS,
  ROOM_HALF_WIDTH_METERS,
} from './internal/environment/room-constants'
import { useToolbarGeometryProjection } from './internal/selection/use-toolbar-geometry-projection'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import { sceneDocumentActions, useItems } from '@/core/scene-contracts'
import {
  clearSceneServices,
  registerSceneServices,
} from './internal/scene-services'

const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5
const EDGE_SNAP_THRESHOLD = 0.12
const ROOM_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_WIDTH_METERS,
  maxX: ROOM_HALF_WIDTH_METERS,
  minZ: -ROOM_HALF_DEPTH_METERS,
  maxZ: ROOM_HALF_DEPTH_METERS,
}

export function Scene({
  renderQuality = 'default',
  catalog,
  collections,
  onCanvasPointerSelection,
  onAssetsReady,
  previewedId = null,
  onPreviewChange,
  floorOption = null,
  wallOption = null,
  onFloorLoadingChange,
}: {
  renderQuality?: 'default' | 'e2e-low'
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  onCanvasPointerSelection?: (id: string) => void
  onAssetsReady?: () => void
  previewedId?: string | null
  onPreviewChange?: (id: string | null) => void
  floorOption?: FloorFinishOption | null
  wallOption?: WallFinishOption | null
  onFloorLoadingChange?: (isLoading: boolean) => void
}) {
  const isE2ELowQuality = renderQuality === 'e2e-low'
  if (import.meta.env.DEV || IS_E2E_BUILD) {
    perfCounters.incrSceneRender()
  }
  const camera = useThree((state) => state.camera)
  // Subscribe to width/height primitives so r3f's per-frame state updates
  // don't churn a fresh `size` object reference and re-fire dependent effects.
  // Without this, the selected-toolbar geometry useEffect re-runs every frame
  // during camera rotation, producing a re-render → effect → emit cascade
  // that visibly jitters the floating toolbar.
  const canvasWidth = useThree((state) => state.size.width)
  const canvasHeight = useThree((state) => state.size.height)
  const canvasSize = useMemo(
    () => ({ width: canvasWidth, height: canvasHeight }),
    [canvasWidth, canvasHeight],
  )
  const invalidate = useThree((state) => state.invalidate)
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
  const cameraKeyStateRef = useRef<CameraKeyState>(new Set())
  const furniture = useItems()
  const {
    objectRefs,
    registerObject,
    selectFurniture,
    selectedId,
    selection,
    setSelectedIdAndResolveObject,
  } = useSceneSelection({
    furniture,
  })

  const updateFurniturePosition = useCallback(
    (id: string, nextPosition: [number, number, number]) => {
      sceneDocumentActions.updateHistory((currentHistory) => {
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
    updateHistory: sceneDocumentActions.updateHistory,
    bounds: ROOM_BOUNDS,
    floorPlaneY: FLOOR_PLANE_Y,
    snapSize: SNAP_SIZE,
    edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
    areFurnitureCollectionsEqual,
  })

  const {
    undo: handleUndo,
    redo: handleRedo,
    restoreInitialLayout: handleRestoreInitialLayout,
  } = useHistoryOperations({
    isDragging: Boolean(dragState),
    catalog,
    collections,
    sourceScenesByPath,
  })

  const {
    select: handleSelect,
    clearSelection: handleClearSelection,
    selectById: handleSelectById,
  } = useSelectionOperations({
    isDragging: Boolean(dragState),
    onCanvasPointerSelection,
    selectFurniture,
    setSelectedIdAndResolveObject,
  })

  const {
    deleteSelection: handleDeleteSelection,
    moveSelection: handleMoveSelection,
    setSelectionTransform: handleSetSelectionTransform,
    rotateSelection: handleRotateSelection,
    addFurniture: handleAddFurniture,
  } = useFurnitureOperations({
    dragState,
    clearDragState,
    catalog,
    collections,
    sourceScenesByPath,
    bounds: ROOM_BOUNDS,
    edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
    snapSize: SNAP_SIZE,
  })

  const {
    setCameraPreset: handleSetCameraPreset,
    getCameraPosition: handleGetCameraPosition,
    setCameraKeyState: handleSetCameraKeyState,
    focusSelected: handleFocusSelected,
  } = useCameraOperations({
    camera,
    cameraControlsRef,
    cameraKeyStateRef,
    objectRefs,
    invalidate,
  })

  useCameraKeyMotion({ cameraControlsRef, cameraKeyStateRef })

  const getSnapshot = useSceneSnapshot({
    camera,
    canvasSize,
    furniture,
    objectRefs,
  })

  useLayoutEffect(() => {
    registerSceneServices({
      addFurniture: handleAddFurniture,
      clearSelection: handleClearSelection,
      deleteSelection: handleDeleteSelection,
      focusSelected: handleFocusSelected,
      getCameraPosition: handleGetCameraPosition,
      getSnapshot,
      moveSelection: handleMoveSelection,
      redo: handleRedo,
      restoreInitialLayout: handleRestoreInitialLayout,
      rotateSelection: handleRotateSelection,
      setCameraKeyState: handleSetCameraKeyState,
      selectById: handleSelectById,
      setCameraPreset: handleSetCameraPreset,
      setSelectionTransform: handleSetSelectionTransform,
      undo: handleUndo,
    })

    return () => {
      clearSceneServices()
    }
  }, [
    handleAddFurniture,
    handleClearSelection,
    handleDeleteSelection,
    handleFocusSelected,
    handleGetCameraPosition,
    getSnapshot,
    handleMoveSelection,
    handleRedo,
    handleRestoreInitialLayout,
    handleRotateSelection,
    handleSetCameraKeyState,
    handleSelectById,
    handleSetCameraPreset,
    handleSetSelectionTransform,
    handleUndo,
  ])

  const isDragging = Boolean(dragState)

  useEffect(() => {
    sceneDocumentActions.setDragging(isDragging)
  }, [isDragging])

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

  useToolbarGeometryProjection({
    selectedId,
    objectRefs,
    camera,
    canvasSize,
  })

  return (
    <>
      <SelectionOutlineEffect
        selection={selection}
        preview={showPreviewOutline ? previewMeshes : []}
        lowQuality={isE2ELowQuality}
      />
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
