import {
  useEffect,
  useImperativeHandle,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { useFrame } from '@react-three/fiber'
import { type Object3D } from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { HistoryState } from '@/lib/ui/editor-history'
import { CAMERA_PRESETS } from '@/lib/three/camera-presets'
import {
  addFurnitureToHistory,
  buildFurnitureItemsFromInstances,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
} from './furniture-operations'
import { resolveMovedFurniturePosition } from '@/lib/three/furniture-layout'
import { commitHistoryPresent } from '@/lib/ui/editor-history'
import { createHistoryState } from '@/lib/ui/editor-history'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { createSceneSnapshot } from './scene-snapshot'
import type { CameraKeyState, MoveSource, SceneRef } from '../scene.types'
import type {
  FurnitureInstance,
  FurnitureItem,
} from '../objects/furniture.types'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '../objects/furniture-catalog'

interface UseSceneImperativeApiOptions {
  ref: React.Ref<SceneRef>
  bounds: LayoutBounds
  camera: Parameters<typeof createSceneSnapshot>[3]
  canvasSize: Parameters<typeof createSceneSnapshot>[4]
  cameraControlsRef: RefObject<CameraControlsImpl | null>
  catalog: FurnitureCatalogEntry[]
  clearDragState: () => void
  collections: FurnitureCollection[]
  dragState: { id: string } | null
  edgeSnapThreshold: number
  furniture: FurnitureItem[]
  history: HistoryState<FurnitureItem[]>
  instanceIdRef: RefObject<number>
  objectRefs: RefObject<Map<string, Object3D>>
  rotateSelectedFurniture: (deltaRadians: number) => void
  selectFurniture: (id: string | null) => void
  selectedId: string | null
  setHistory: Dispatch<SetStateAction<HistoryState<FurnitureItem[]>>>
  setSelectedIdAndResolveObject: (id: string | null) => void
  snapSize: number
  sourceScenesByPath: Map<string, Object3D>
}

export function useSceneImperativeApi({
  ref,
  bounds,
  camera,
  canvasSize,
  cameraControlsRef,
  catalog,
  clearDragState,
  collections,
  dragState,
  edgeSnapThreshold,
  furniture,
  history,
  instanceIdRef,
  objectRefs,
  rotateSelectedFurniture,
  selectFurniture,
  selectedId,
  setHistory,
  setSelectedIdAndResolveObject,
  snapSize,
  sourceScenesByPath,
}: UseSceneImperativeApiOptions): void {
  const historyRef = useRef(history)
  const selectedIdRef = useRef(selectedId)
  const furnitureRef = useRef(furniture)
  const dragStateRef = useRef(dragState)
  const cameraKeyStateRef = useRef<CameraKeyState>(new Set())

  useEffect(() => {
    historyRef.current = history
  }, [history])

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    furnitureRef.current = furniture
  }, [furniture])

  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  // Apply continuous camera motion based on held-key state.
  useFrame((_, delta) => {
    const controls = cameraControlsRef.current
    if (!controls) {
      return
    }

    const keyState = cameraKeyStateRef.current
    const deltaTime = Math.min(delta, 0.05) // Cap delta to prevent large jumps after frame stalls

    // Camera motion constants tuned for the 6x6 meter room scale.
    const ROTATION_SPEED = 1.5 // radians per second
    const TRUCK_SPEED = 3.0 // units per second (pan/strafe)
    const DOLLY_SPEED = 3.0 // units per second (zoom forward/backward)

    const hasShift = keyState.has('shift')

    // Camera controls: WASD for orbit, Shift+WASD for pan
    // Orbit (no shift)
    if (keyState.has('keyW') && !hasShift) {
      void controls.rotate(0, -ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && !hasShift) {
      void controls.rotate(0, ROTATION_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && !hasShift) {
      void controls.rotate(-ROTATION_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && !hasShift) {
      void controls.rotate(ROTATION_SPEED * deltaTime, 0, false)
    }

    // Pan (Shift+WASD)
    if (keyState.has('keyW') && hasShift) {
      void controls.truck(0, -TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyS') && hasShift) {
      void controls.truck(0, TRUCK_SPEED * deltaTime, false)
    }
    if (keyState.has('keyA') && hasShift) {
      void controls.truck(-TRUCK_SPEED * deltaTime, 0, false)
    }
    if (keyState.has('keyD') && hasShift) {
      void controls.truck(TRUCK_SPEED * deltaTime, 0, false)
    }

    // Zoom/dolly camera with = and - keys
    const hasEqual = keyState.has('equal')
    const hasMinus = keyState.has('minus')
    if (hasEqual || hasMinus) {
      const dollyDistance = hasEqual
        ? DOLLY_SPEED * deltaTime
        : -DOLLY_SPEED * deltaTime
      void controls.dolly(dollyDistance, false)
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      clearSelection: () => {
        if (!dragStateRef.current) {
          selectedIdRef.current = null
          selectFurniture(null)
        }
      },
      selectById: (id: string | null) => {
        if (dragStateRef.current) {
          return {
            ok: false,
            status: 'blocked-dragging',
          }
        }

        if (id === null) {
          selectedIdRef.current = null
          setSelectedIdAndResolveObject(null)
          return {
            ok: true,
            status: 'cleared',
          }
        }

        const itemExists = furnitureRef.current.some((item) => item.id === id)

        if (!itemExists) {
          return {
            ok: false,
            status: 'not-found',
          }
        }

        selectedIdRef.current = id
        setSelectedIdAndResolveObject(id)

        return {
          ok: true,
          status: 'selected',
        }
      },
      moveSelection: (
        delta: { x: number; z: number },
        _options?: { source?: MoveSource },
      ) => {
        void _options

        if (dragStateRef.current) {
          return {
            ok: false,
            reason: 'dragging',
          }
        }

        const activeId = selectedIdRef.current

        if (!activeId) {
          return {
            ok: false,
            reason: 'no-selection',
          }
        }

        const activeItem = furnitureRef.current.find(
          (item) => item.id === activeId,
        )

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
          movingId: activeId,
          proposedPosition,
          items: furnitureRef.current,
          edgeSnapThreshold,
          bounds,
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

        const nextFurniture = furnitureRef.current.map((item) => {
          if (item.id !== activeId) {
            return item
          }

          return {
            ...item,
            position: resolvedPosition,
          }
        })

        const nextHistory = commitHistoryPresent(
          historyRef.current,
          nextFurniture,
        )

        historyRef.current = nextHistory
        furnitureRef.current = nextHistory.present
        setHistory(nextHistory)

        return {
          ok: true,
          position: resolvedPosition,
        }
      },
      rotateSelection: (deltaRadians: number) => {
        rotateSelectedFurniture(deltaRadians)
      },
      addFurniture: (catalogId: string) => {
        const operationResult = addFurnitureToHistory({
          history: historyRef.current,
          sourceScenesByPath,
          catalogId,
          nextId: createFurnitureInstanceId(instanceIdRef.current + 1),
          catalog,
          collections,
          bounds,
          edgeSnapThreshold,
          snapSize,
        })

        historyRef.current = operationResult.history
        furnitureRef.current = operationResult.history.present
        setHistory(operationResult.history)

        if (operationResult.incrementInstanceId) {
          instanceIdRef.current += 1
          selectedIdRef.current = operationResult.result.ok
            ? operationResult.result.id
            : null
          setSelectedIdAndResolveObject(
            operationResult.result.ok ? operationResult.result.id : null,
          )
        }

        return operationResult.result
      },
      deleteSelection: () => {
        const operationResult = deleteSelectionFromHistory(
          historyRef.current,
          selectedIdRef.current,
        )

        if (!operationResult.deleted) {
          return false
        }

        historyRef.current = operationResult.history
        furnitureRef.current = operationResult.history.present
        setHistory(operationResult.history)

        if (
          operationResult.deletedId &&
          dragStateRef.current?.id === operationResult.deletedId
        ) {
          clearDragState()
        }

        selectedIdRef.current = null
        setSelectedIdAndResolveObject(null)

        return true
      },
      undo: () => {
        const undoResult = undoSceneHistory({
          history: historyRef.current,
          selectedId: selectedIdRef.current,
          isDragging: Boolean(dragStateRef.current),
        })

        if (!undoResult.didChange) {
          return false
        }

        historyRef.current = undoResult.history
        furnitureRef.current = undoResult.history.present
        selectedIdRef.current = undoResult.selectedId
        setHistory(undoResult.history)
        setSelectedIdAndResolveObject(undoResult.selectedId)

        return true
      },
      redo: () => {
        const redoResult = redoSceneHistory({
          history: historyRef.current,
          selectedId: selectedIdRef.current,
          isDragging: Boolean(dragStateRef.current),
        })

        if (!redoResult.didChange) {
          return false
        }

        historyRef.current = redoResult.history
        furnitureRef.current = redoResult.history.present
        selectedIdRef.current = redoResult.selectedId
        setHistory(redoResult.history)
        setSelectedIdAndResolveObject(redoResult.selectedId)

        return true
      },
      getSnapshot: () =>
        createSceneSnapshot(
          furniture,
          selectedId,
          objectRefs.current,
          camera,
          canvasSize,
        ),
      getReadModel: () => ({
        selectedId: selectedIdRef.current,
        items: furnitureRef.current,
      }),
      restoreInitialLayout: (instances: FurnitureInstance[]) => {
        const restoredItems = buildFurnitureItemsFromInstances(
          instances,
          catalog,
          collections,
          sourceScenesByPath,
        )

        const newHistory = createHistoryState(restoredItems)

        historyRef.current = newHistory
        furnitureRef.current = restoredItems
        selectedIdRef.current = null

        setHistory(newHistory)
        setSelectedIdAndResolveObject(null)

        // Reseed the instance-id counter so future adds don't collide.
        const maxSuffix = instances.reduce((max, item) => {
          const match = /^furniture-instance-(\d+)$/.exec(item.id)
          const suffix = match ? parseInt(match[1], 10) : 0
          return Math.max(max, suffix)
        }, 0)

        instanceIdRef.current = maxSuffix
      },
      setCameraPreset: (preset) => {
        const view = CAMERA_PRESETS[preset]
        void cameraControlsRef.current?.setLookAt(
          ...view.position,
          ...view.target,
          true,
        )
      },
      focusSelected: () => {
        const ctrl = cameraControlsRef.current
        if (!ctrl || !selectedIdRef.current) return
        const object = objectRefs.current.get(selectedIdRef.current)
        if (!object) return
        void ctrl.fitToBox(object, true, {
          paddingTop: 0.5,
          paddingBottom: 0.5,
          paddingLeft: 0.5,
          paddingRight: 0.5,
        })
      },
      setCameraKeyState: (keyState: CameraKeyState) => {
        cameraKeyStateRef.current = keyState
      },
    }),
    [
      camera,
      canvasSize,
      catalog,
      clearDragState,
      bounds,
      collections,
      objectRefs,
      furniture,
      rotateSelectedFurniture,
      selectFurniture,
      selectedId,
      setHistory,
      setSelectedIdAndResolveObject,
      snapSize,
      sourceScenesByPath,
      edgeSnapThreshold,
      instanceIdRef,
      cameraControlsRef,
    ],
  )
}
