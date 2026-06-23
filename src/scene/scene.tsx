import { getMeshes } from '@/shared/lib/three/get-meshes'
import { getVisualObjectBounds } from '@/shared/lib/three/get-visual-object-bounds'
import {
  CAMERA_PRESETS,
  type CameraPreset,
} from '@/shared/lib/three/camera-presets'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import { CameraControls } from './internal/camera/camera-controls'
import { InteractiveFurniture } from './internal/objects/interactive-furniture'
import { useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CameraControlsImpl } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type Object3D } from 'three'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import {
  resolveAbsoluteFurnitureTransform,
  resolveMovedFurniturePosition,
  type LayoutBounds,
} from '@/shared/lib/three/furniture-layout'
import { commitHistoryPresent } from '@/shared/lib/ui/editor-history'
import type { FurnitureInstance } from './objects/furniture.types'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from './objects/furniture-catalog'
import {
  addFurnitureToHistory,
  areFurnitureCollectionsEqual,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
  rotateSelectedFurnitureInHistory,
  updateFurniturePositionInHistory,
} from './internal/furniture-operations'
import { validateCatalogAssetNodes } from './internal/validate-catalog-asset-nodes'
import {
  redoSceneHistory,
  undoSceneHistory,
} from './internal/scene-history-state'
import type {
  AddFurnitureResult,
  CameraKeyState,
  MoveSource,
  MoveSelectionResult,
  SelectedToolbarGeometry,
  UpdateSelectionTransformResult,
} from './scene.types'
import { useSceneDrag } from './internal/use-scene-drag'
import {
  buildRestoredSceneHistory,
  useSceneImperativeApi,
} from './internal/use-scene-imperative-api'
import { useSceneSelection } from './internal/use-scene-selection'
import { BlendFunction } from 'postprocessing'
import {
  ROOM_HALF_DEPTH_METERS,
  ROOM_HALF_WIDTH_METERS,
} from './internal/environment/room-constants'
import { computeSelectedToolbarGeometry } from './internal/selected-toolbar-geometry'
import { perfCounters } from '@/shared/debug/perf-counters'
import {
  sceneDocumentActions,
  sceneDocumentStore,
  useItems,
} from '@/core/scene-contracts'
import { toolbarGeometryActions } from '@/core/scene-contracts'
import {
  clearSceneServices,
  registerSceneServices,
} from './internal/scene-services'

const FLOOR_PLANE_Y = 0
const SNAP_SIZE = 0.5
const EDGE_SNAP_THRESHOLD = 0.12
const TOOLBAR_GEOMETRY_DEADBAND_PX = 0.5
// These are Three.js render layers used by OutlineEffect selection, not z-order.
const SELECTED_OUTLINE_LAYER = 10
const PREVIEW_OUTLINE_LAYER = 11
const ROOM_BOUNDS: LayoutBounds = {
  minX: -ROOM_HALF_WIDTH_METERS,
  maxX: ROOM_HALF_WIDTH_METERS,
  minZ: -ROOM_HALF_DEPTH_METERS,
  maxZ: ROOM_HALF_DEPTH_METERS,
}

function roundCameraCoordinate(value: number) {
  return Math.round(value * 1000) / 1000
}

function approximatelyEqualPx(left: number, right: number) {
  return Math.abs(left - right) <= TOOLBAR_GEOMETRY_DEADBAND_PX
}

function isSameToolbarGeometry(
  previousGeometry: SelectedToolbarGeometry,
  nextGeometry: SelectedToolbarGeometry,
) {
  if (
    previousGeometry.kind === 'unavailable' &&
    nextGeometry.kind === 'unavailable'
  ) {
    return (
      previousGeometry.selectedId === nextGeometry.selectedId &&
      previousGeometry.reason === nextGeometry.reason
    )
  }

  if (
    previousGeometry.kind !== 'available' ||
    nextGeometry.kind !== 'available'
  ) {
    return false
  }

  if (
    previousGeometry.selectedId !== nextGeometry.selectedId ||
    previousGeometry.source !== nextGeometry.source ||
    previousGeometry.sourceNodeName !== nextGeometry.sourceNodeName ||
    previousGeometry.sourcePointCount !== nextGeometry.sourcePointCount ||
    previousGeometry.projectedPointCount !== nextGeometry.projectedPointCount
  ) {
    return false
  }

  if (
    !approximatelyEqualPx(
      previousGeometry.canvasSize.width,
      nextGeometry.canvasSize.width,
    ) ||
    !approximatelyEqualPx(
      previousGeometry.canvasSize.height,
      nextGeometry.canvasSize.height,
    )
  ) {
    return false
  }

  if (previousGeometry.points.length !== nextGeometry.points.length) {
    return false
  }

  return previousGeometry.points.every((previousPoint, index) => {
    const nextPoint = nextGeometry.points[index]
    return (
      approximatelyEqualPx(previousPoint.x, nextPoint.x) &&
      approximatelyEqualPx(previousPoint.y, nextPoint.y)
    )
  })
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
  if (import.meta.env.DEV) {
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
  const toolbarGeometryAccumulatorRef = useRef(0)
  const lastToolbarGeometryRef = useRef<SelectedToolbarGeometry | null>(null)
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

  const handleSelect = useCallback(
    (id: string) => {
      onCanvasPointerSelection?.(id)
      selectFurniture(id)
    },
    [onCanvasPointerSelection, selectFurniture],
  )

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

  const handleRestoreInitialLayout = useCallback(
    (instances: FurnitureInstance[]) => {
      const restoredState = buildRestoredSceneHistory({
        instances,
        catalog,
        collections,
        sourceScenesByPath,
      })

      sceneDocumentActions.setInstanceIdCounter(restoredState.instanceIdSeed)
      sceneDocumentActions.setHistory(restoredState.history)
      sceneDocumentActions.setSelectedId(null)
    },
    [catalog, collections, sourceScenesByPath],
  )

  const handleClearSelection = useCallback(() => {
    if (dragState) {
      return
    }

    selectFurniture(null)
  }, [dragState, selectFurniture])

  const handleDeleteSelection = useCallback(() => {
    const { history, selectedId } = sceneDocumentStore.getState()
    const operationResult = deleteSelectionFromHistory(history, selectedId)

    if (!operationResult.deleted) {
      return false
    }

    sceneDocumentActions.setHistory(operationResult.history)

    if (
      operationResult.deletedId &&
      dragState?.id === operationResult.deletedId
    ) {
      clearDragState()
    }

    sceneDocumentActions.setSelectedId(null)

    return true
  }, [clearDragState, dragState])

  const handleSelectById = useCallback(
    (id: string | null) => {
      const furnitureItems = sceneDocumentStore.getState().history.present

      if (dragState) {
        return {
          ok: false as const,
          status: 'blocked-dragging' as const,
        }
      }

      if (id === null) {
        setSelectedIdAndResolveObject(null)
        return {
          ok: true as const,
          status: 'cleared' as const,
        }
      }

      const itemExists = furnitureItems.some((item) => item.id === id)

      if (!itemExists) {
        return {
          ok: false as const,
          status: 'not-found' as const,
        }
      }

      setSelectedIdAndResolveObject(id)

      return {
        ok: true as const,
        status: 'selected' as const,
      }
    },
    [dragState, setSelectedIdAndResolveObject],
  )

  const handleUndo = useCallback(() => {
    const { history, selectedId } = sceneDocumentStore.getState()
    const undoResult = undoSceneHistory({
      history,
      selectedId,
      isDragging: Boolean(dragState),
    })

    if (!undoResult.didChange) {
      return false
    }

    sceneDocumentActions.setHistory(undoResult.history)
    sceneDocumentActions.setSelectedId(undoResult.selectedId)

    return true
  }, [dragState])

  const handleRedo = useCallback(() => {
    const { history, selectedId } = sceneDocumentStore.getState()
    const redoResult = redoSceneHistory({
      history,
      selectedId,
      isDragging: Boolean(dragState),
    })

    if (!redoResult.didChange) {
      return false
    }

    sceneDocumentActions.setHistory(redoResult.history)
    sceneDocumentActions.setSelectedId(redoResult.selectedId)

    return true
  }, [dragState])

  const handleMoveSelection = useCallback(
    (
      delta: { x: number; z: number },
      _options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      void _options
      const { history, selectedId } = sceneDocumentStore.getState()
      const furnitureItems = history.present

      if (dragState) {
        return {
          ok: false,
          reason: 'dragging',
        }
      }

      if (!selectedId) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      const activeItem = furnitureItems.find((item) => item.id === selectedId)

      if (!activeItem) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      const proposedPosition: [number, number, number] = [
        activeItem.position[0] + delta.x,
        activeItem.position[1],
        activeItem.position[2] + delta.z,
      ]

      const resolvedPosition = resolveMovedFurniturePosition({
        movingId: selectedId,
        proposedPosition,
        items: furnitureItems,
        edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
        bounds: ROOM_BOUNDS,
      })

      if (!resolvedPosition) {
        return {
          ok: false,
          reason: 'blocked-collision',
        }
      }

      const positionUnchanged =
        resolvedPosition[0] === activeItem.position[0] &&
        resolvedPosition[1] === activeItem.position[1] &&
        resolvedPosition[2] === activeItem.position[2]

      if (positionUnchanged) {
        const attemptedMovement =
          proposedPosition[0] !== activeItem.position[0] ||
          proposedPosition[2] !== activeItem.position[2]

        return {
          ok: false,
          reason: attemptedMovement ? 'blocked-bounds' : 'no-op',
        }
      }

      const nextFurniture = furnitureItems.map((item) => {
        if (item.id !== selectedId) {
          return item
        }

        return {
          ...item,
          position: resolvedPosition,
        }
      })

      sceneDocumentActions.updateHistory((currentHistory) =>
        commitHistoryPresent(currentHistory, nextFurniture),
      )

      return {
        ok: true,
        position: resolvedPosition,
      }
    },
    [dragState],
  )

  const handleSetSelectionTransform = useCallback(
    (input: {
      position?: [number, number, number]
      rotationY?: number
    }): UpdateSelectionTransformResult => {
      const { history, selectedId } = sceneDocumentStore.getState()
      const furnitureItems = history.present

      if (dragState) {
        return {
          ok: false,
          reason: 'dragging',
        }
      }

      if (!selectedId) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      const activeItem = furnitureItems.find((item) => item.id === selectedId)

      if (!activeItem) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      const nextPosition = input.position ?? activeItem.position
      const nextRotationY = input.rotationY ?? activeItem.rotationY

      if (
        nextPosition[0] === activeItem.position[0] &&
        nextPosition[1] === activeItem.position[1] &&
        nextPosition[2] === activeItem.position[2] &&
        nextRotationY === activeItem.rotationY
      ) {
        return {
          ok: false,
          reason: 'no-op',
        }
      }

      const resolvedTransform = resolveAbsoluteFurnitureTransform({
        movingId: selectedId,
        proposedPosition: nextPosition,
        proposedRotationY: nextRotationY,
        items: furnitureItems,
        bounds: ROOM_BOUNDS,
      })

      if (!resolvedTransform) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      if (!resolvedTransform.ok) {
        return resolvedTransform
      }

      const nextFurniture = furnitureItems.map((item) => {
        if (item.id !== selectedId) {
          return item
        }

        return {
          ...item,
          position: resolvedTransform.position,
          rotationY: resolvedTransform.rotationY,
        }
      })

      const nextHistory = commitHistoryPresent(
        history,
        nextFurniture,
        areFurnitureCollectionsEqual,
      )
      const updatedItem = nextHistory.present.find(
        (item) => item.id === selectedId,
      )

      if (!updatedItem) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      sceneDocumentActions.setHistory(nextHistory)

      return {
        ok: true,
        item: updatedItem,
      }
    },
    [dragState],
  )

  const handleRotateSelection = useCallback((deltaRadians: number) => {
    const { history, selectedId } = sceneDocumentStore.getState()
    const nextHistory = rotateSelectedFurnitureInHistory({
      history,
      selectedId,
      deltaRadians,
      bounds: ROOM_BOUNDS,
    })

    sceneDocumentActions.setHistory(nextHistory)
  }, [])

  const handleAddFurniture = useCallback(
    (catalogId: string): AddFurnitureResult => {
      const { history, instanceIdCounter } = sceneDocumentStore.getState()
      const operationResult = addFurnitureToHistory({
        history,
        sourceScenesByPath,
        catalogId,
        nextId: createFurnitureInstanceId(instanceIdCounter + 1),
        catalog,
        collections,
        bounds: ROOM_BOUNDS,
        edgeSnapThreshold: EDGE_SNAP_THRESHOLD,
        snapSize: SNAP_SIZE,
      })

      sceneDocumentActions.setHistory(operationResult.history)

      if (operationResult.incrementInstanceId) {
        sceneDocumentActions.setInstanceIdCounter(instanceIdCounter + 1)
        sceneDocumentActions.setSelectedId(
          operationResult.result.ok ? operationResult.result.id : null,
        )
      }

      return operationResult.result
    },
    [catalog, collections, sourceScenesByPath],
  )

  const handleSetCameraPreset = useCallback((preset: CameraPreset) => {
    const view = CAMERA_PRESETS[preset]
    void cameraControlsRef.current?.setLookAt(
      ...view.position,
      ...view.target,
      true,
    )
  }, [])

  const handleGetCameraPosition = useCallback(() => {
    return camera.position.toArray().map((coordinate) => {
      return roundCameraCoordinate(coordinate)
    }) as [number, number, number]
  }, [camera])

  const handleSetCameraKeyState = useCallback(
    (keyState: CameraKeyState) => {
      cameraKeyStateRef.current = keyState

      if (keyState.size > 0) {
        invalidate()
      }
    },
    [invalidate],
  )

  const getSnapshot = useSceneImperativeApi({
    camera,
    cameraKeyStateRef,
    canvasSize,
    cameraControlsRef,
    furniture,
    objectRefs,
  })

  const handleFocusSelected = useCallback(() => {
    const { selectedId } = sceneDocumentStore.getState()
    const controls = cameraControlsRef.current

    if (!controls || !selectedId) {
      return
    }

    const object = objectRefs.current.get(selectedId)

    if (!object) {
      return
    }

    const bounds = getVisualObjectBounds(object)

    if (!bounds) {
      return
    }

    void controls.fitToBox(bounds, true, {
      paddingTop: 0.5,
      paddingBottom: 0.5,
      paddingLeft: 0.5,
      paddingRight: 0.5,
    })
  }, [cameraControlsRef, objectRefs])

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

  useEffect(() => {
    const nextGeometry = computeSelectedToolbarGeometry({
      selectedId,
      object: selectedId ? (objectRefs.current.get(selectedId) ?? null) : null,
      camera,
      canvasSize,
    })

    const previousGeometry = lastToolbarGeometryRef.current
    if (
      previousGeometry &&
      isSameToolbarGeometry(previousGeometry, nextGeometry)
    ) {
      return
    }

    lastToolbarGeometryRef.current = nextGeometry
    if (import.meta.env.DEV) {
      perfCounters.incrToolbarEmission()
      perfCounters.incrToolbarEmissionFromEffect()
    }
    toolbarGeometryActions.setToolbarGeometry(nextGeometry)
  }, [camera, canvasSize, objectRefs, selectedId])

  useFrame((_, delta) => {
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
      isSameToolbarGeometry(previousGeometry, nextGeometry)
    ) {
      return
    }

    lastToolbarGeometryRef.current = nextGeometry
    if (import.meta.env.DEV) {
      perfCounters.incrToolbarEmission()
      perfCounters.incrToolbarEmissionFromFrame()
    }
    toolbarGeometryActions.setToolbarGeometry(nextGeometry)
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
