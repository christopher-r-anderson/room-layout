import { getMeshes } from '@/scene/internal/three/get-meshes'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import { resolveMoodExposure } from './internal/environment/lighting-mood'
import type {
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { CameraControls } from './internal/camera/camera-controls'
import { InteractiveFurniture } from './internal/furniture/interactive-furniture'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CameraControlsImpl } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { SelectionOutlineEffect } from './internal/selection/selection-outline-effect'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import {
  areFurnitureCollectionsEqual,
  updateFurniturePositionInHistory,
} from '@/core/operations/furniture-operations'
import type { CameraKeyState } from '@/core/scene.types'
import { useSceneDrag } from './internal/drag/use-scene-drag'
import { useSceneSnapshot } from './internal/snapshot/use-scene-snapshot'
import { useCameraOperations } from './internal/camera/use-camera-operations'
import { useCameraKeyMotion } from './internal/camera/use-camera-key-motion'
import { useSceneSelection } from './internal/selection/use-scene-selection'
import {
  FLOOR_PLANE_Y,
  FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
  FURNITURE_SNAP_SIZE_METERS,
  ROOM_LAYOUT_BOUNDS,
} from '@/domain/geometry/room-metrics'
import { useToolbarGeometryProjection } from './internal/selection/use-toolbar-geometry-projection'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import {
  sceneDocumentActions,
  useItems,
} from '@/core/stores/scene-document-store'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { sceneSessionActions } from '@/core/stores/scene-session-store'
import {
  clearSceneServices,
  registerSceneServices,
} from '@/core/scene-services'
import { useLoadedCollectionScenes } from './internal/furniture/collection-scene-registry'
import { createCollectionSceneLoader } from './internal/furniture/collection-scene-loader'

export function Scene({
  renderQuality = 'default',
  catalog,
  collections,
  previewedId = null,
  onPreviewChange,
  floorOption = null,
  wallOption = null,
  lightingMoodOption = null,
}: {
  renderQuality?: 'default' | 'e2e-low'
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  previewedId?: string | null
  onPreviewChange?: (id: string | null) => void
  floorOption?: FloorFinishOption | null
  wallOption?: WallFinishOption | null
  lightingMoodOption?: LightingMoodOption | null
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
  const gl = useThree((state) => state.gl)
  // Accessor for fresh r3f state when we need to imperatively touch the renderer
  // (e.g. tone-mapping exposure) without subscribing to or mutating a hook value.
  const getThreeState = useThree((state) => state.get)
  // Parse, validate, and register for collection GLBs, exposed to core through
  // the services below; created per renderer because the KTX2 transcoder config
  // needs it.
  const loadCollectionScene = useMemo(
    () => createCollectionSceneLoader({ renderer: gl, catalog, collections }),
    [gl, catalog, collections],
  )
  // Parsed collection scenes, registered by the loader as they resolve. Partial and
  // growing, so the room renders before any furniture; each item appears once its
  // collection is present.
  const sourceScenesByPath = useLoadedCollectionScenes()

  const cameraControlsRef = useRef<CameraControlsImpl | null>(null)
  const cameraKeyStateRef = useRef<CameraKeyState>(new Set())
  const furniture = useItems()
  const { objectRefs, registerObject, selectedId, selection } =
    useSceneSelection()

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

  const { dragState, handleDragEnd, handleDragStart, handleMove } =
    useSceneDrag({
      furniture,
      updateFurniturePosition,
      updateHistory: sceneDocumentActions.updateHistory,
      bounds: ROOM_LAYOUT_BOUNDS,
      floorPlaneY: FLOOR_PLANE_Y,
      snapSize: FURNITURE_SNAP_SIZE_METERS,
      edgeSnapThreshold: FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
      areFurnitureCollectionsEqual,
    })

  const {
    setCameraPreset: handleSetCameraPreset,
    setCameraKeyState: handleSetCameraKeyState,
    focusSelected: handleFocusSelected,
  } = useCameraOperations({
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

  // The handlers close over fresh component state, so keep them in a ref synced
  // each render and register stable wrappers that read the latest at call time
  // (same shape as useCommandDispatchValue). Registration then lasts exactly one
  // mount and drives the lifecycle store's sceneReady flag: a passive effect so
  // readiness never fires before the canvas has painted, and handler churn
  // never re-registers.
  const servicesRef = useRef({
    focusSelected: handleFocusSelected,
    getSnapshot,
    loadCollectionScene,
    setCameraKeyState: handleSetCameraKeyState,
    setCameraPreset: handleSetCameraPreset,
  })

  useLayoutEffect(() => {
    servicesRef.current = {
      focusSelected: handleFocusSelected,
      getSnapshot,
      loadCollectionScene,
      setCameraKeyState: handleSetCameraKeyState,
      setCameraPreset: handleSetCameraPreset,
    }
  })

  useEffect(() => {
    if (import.meta.env.DEV || IS_E2E_BUILD) {
      perfCounters.incrSceneMount()
    }
    registerSceneServices({
      focusSelected: () => {
        servicesRef.current.focusSelected()
      },
      getSnapshot: () => servicesRef.current.getSnapshot(),
      loadCollectionScene: (path, bytes) =>
        servicesRef.current.loadCollectionScene(path, bytes),
      setCameraKeyState: (keyState) => {
        servicesRef.current.setCameraKeyState(keyState)
      },
      setCameraPreset: (preset) => {
        servicesRef.current.setCameraPreset(preset)
      },
    })

    return () => {
      clearSceneServices()
    }
  }, [])

  const isDragging = Boolean(dragState)

  // The active mood drives renderer exposure. Set here (not in the Canvas's
  // one-shot onCreated) so switching moods re-tunes exposure reactively. The
  // e2e low-quality lane keeps exposure pinned to 1 for deterministic captures.
  const moodExposure = resolveMoodExposure(lightingMoodOption, isE2ELowQuality)
  useEffect(() => {
    getThreeState().gl.toneMappingExposure = moodExposure
    invalidate()
  }, [getThreeState, invalidate, moodExposure])

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
      <Lighting lowQuality={isE2ELowQuality} mood={lightingMoodOption} />
      <Room
        receiveShadows={!isE2ELowQuality}
        floorOption={floorOption}
        wallOption={wallOption}
        onFloorLoadingChange={sceneSessionActions.setFloorFinishLoading}
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
          onSelect={selectByCanvasPointer}
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
