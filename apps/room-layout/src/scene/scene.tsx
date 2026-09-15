import { getMeshes } from '@/scene/internal/three/get-meshes'
import { Room } from './internal/environment/room'
import { Lighting } from './internal/environment/lighting'
import { getShadowExtent } from './internal/environment/shadow-extent'
import { resolveMoodExposure } from './internal/environment/lighting-mood'
import type {
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { CameraControls } from './internal/camera/camera-controls'
import { getCameraMaxDistance } from './internal/camera/camera-presets'
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
  getRoomLayoutBounds,
} from '@/domain/geometry/room-metrics'
import { useToolbarGeometryProjection } from './internal/selection/use-toolbar-geometry-projection'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import {
  sceneDocumentActions,
  useItems,
  useRoomSize,
} from '@/core/stores/scene-document-store'
import { useOutOfBoundsItemIds } from '@/core/operations/room-size'
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
  // Subscribe to width/height primitives: r3f's per-frame state updates churn
  // a fresh `size` object reference, which would re-fire dependent effects
  // every frame during camera rotation and visibly jitter the floating toolbar.
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
  // Created per renderer because the KTX2 transcoder config needs it.
  const loadCollectionScene = useMemo(
    () => createCollectionSceneLoader({ renderer: gl, catalog, collections }),
    [gl, catalog, collections],
  )
  // Partial and growing, so the room renders before any furniture; each item
  // appears once its collection is present.
  const sourceScenesByPath = useLoadedCollectionScenes()

  const cameraControlsRef = useRef<CameraControlsImpl | null>(null)
  const cameraKeyStateRef = useRef<CameraKeyState>(new Set())
  const furniture = useItems()
  const roomSize = useRoomSize()
  const roomBounds = useMemo(() => getRoomLayoutBounds(roomSize), [roomSize])
  const {
    objectRefs,
    registeredObjects,
    registerObject,
    selectedId,
    selection,
  } = useSceneSelection()
  const outOfBoundsIds = useOutOfBoundsItemIds()
  // Selection/preview outlines take precedence over the warning outline on
  // the same item, so an engaged item never renders two colors at once.
  const outOfBoundsMeshes = useMemo(
    () =>
      outOfBoundsIds
        .filter((id) => id !== selectedId && id !== previewedId)
        .flatMap((id) => {
          const object = registeredObjects.get(id)
          return object ? getMeshes(object) : []
        }),
    [outOfBoundsIds, registeredObjects, selectedId, previewedId],
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

  const { dragState, handleDragEnd, handleDragStart, handleMove } =
    useSceneDrag({
      furniture,
      updateFurniturePosition,
      updateHistory: sceneDocumentActions.updateHistory,
      bounds: roomBounds,
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

  // Frame the room on the corner preset: instantly on mount (the starting
  // view), animated when the room size changes. Identity compare - it relies
  // on setRoomSize bailing out on unchanged dimensions, so a no-op write
  // never re-frames the camera.
  const framedRoomSizeRef = useRef<typeof roomSize | null>(null)
  useLayoutEffect(() => {
    if (framedRoomSizeRef.current === roomSize) {
      return
    }

    const transition = framedRoomSizeRef.current !== null
    framedRoomSizeRef.current = roomSize
    handleSetCameraPreset('corner', transition)
  }, [roomSize, handleSetCameraPreset])

  const getSnapshot = useSceneSnapshot({
    camera,
    canvasSize,
    furniture,
    objectRefs,
  })

  // The handlers close over fresh component state, so a ref synced each render
  // backs stable registered wrappers. Registration lasts exactly one mount and
  // drives sceneReady; a passive effect so readiness never fires before the
  // canvas has painted.
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
        outOfBounds={outOfBoundsMeshes}
        lowQuality={isE2ELowQuality}
      />
      <CameraControls
        enabled={!dragState}
        controlsRef={cameraControlsRef}
        maxDistance={getCameraMaxDistance(roomSize)}
      />
      <Lighting
        lowQuality={isE2ELowQuality}
        mood={lightingMoodOption}
        shadowExtent={getShadowExtent(roomSize)}
      />
      <Room
        size={roomSize}
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
