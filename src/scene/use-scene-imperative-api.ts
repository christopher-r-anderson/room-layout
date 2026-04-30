import {
  useEffect,
  useImperativeHandle,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { type Object3D } from 'three'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { HistoryState } from '@/lib/ui/editor-history'
import {
  addFurnitureToHistory,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
} from './furniture-operations'
import { resolveMovedFurniturePosition } from '@/lib/three/furniture-layout'
import { commitHistoryPresent } from '@/lib/ui/editor-history'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { createSceneSnapshot } from './scene-snapshot'
import type { SceneRef } from './scene.types'
import type { FurnitureItem } from './objects/furniture.types'

interface UseSceneImperativeApiOptions {
  ref: React.Ref<SceneRef>
  bounds: LayoutBounds
  camera: Parameters<typeof createSceneSnapshot>[3]
  canvasSize: Parameters<typeof createSceneSnapshot>[4]
  clearDragState: () => void
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
  clearDragState,
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
        _options?: { source?: 'keyboard' | 'inspector' | 'drag' },
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
          bounds,
          edgeSnapThreshold,
          snapSize,
        })

        historyRef.current = operationResult.history
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
    }),
    [
      camera,
      canvasSize,
      clearDragState,
      bounds,
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
    ],
  )
}
