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
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { createSceneSnapshot } from './scene-snapshot'
import type { SceneRef } from './scene.types'
import type { FurnitureItem } from './objects/furniture.types'
import {
  applyMoveSelectionResultToHistory,
  moveSelectionToPosition,
} from './scene-move-command'

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
  const deferredMoveBaselineRef = useRef<FurnitureItem[] | null>(null)

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
        if (
          id !== null &&
          !furnitureRef.current.some((item) => item.id === id)
        ) {
          return { ok: false as const, reason: 'invalid-id' as const }
        }

        selectedIdRef.current = id
        setSelectedIdAndResolveObject(id)

        return { ok: true as const, id }
      },
      moveSelection: (delta, options) => {
        const commit = options?.commit ?? 'immediate'
        const currentSelectedId = selectedIdRef.current
        const currentFurniture = historyRef.current.present
        const selectedItem = currentSelectedId
          ? currentFurniture.find((item) => item.id === currentSelectedId)
          : null

        if (!selectedItem && !currentSelectedId) {
          return { ok: false as const, reason: 'none-selected' as const }
        }

        if (!selectedItem) {
          return { ok: false as const, reason: 'invalid-selection' as const }
        }

        const result = moveSelectionToPosition({
          furniture: currentFurniture,
          selectedId: currentSelectedId,
          nextPosition: {
            x: selectedItem.position[0] + delta.x,
            z: selectedItem.position[2] + delta.z,
          },
          bounds,
          edgeSnapThreshold,
        })

        if (!result.ok) {
          return result
        }

        const nextHistory = applyMoveSelectionResultToHistory({
          history: historyRef.current,
          result,
          commit,
          baseline:
            commit === 'immediate'
              ? (deferredMoveBaselineRef.current ?? undefined)
              : undefined,
        })

        if (commit === 'defer' && !deferredMoveBaselineRef.current) {
          deferredMoveBaselineRef.current = historyRef.current.present
        }
        if (commit === 'immediate') {
          deferredMoveBaselineRef.current = null
        }

        historyRef.current = nextHistory
        setHistory(nextHistory)

        return result
      },
      setSelectionPosition: (position, options) => {
        const commit = options?.commit ?? 'immediate'
        const currentFurniture = historyRef.current.present
        const result = moveSelectionToPosition({
          furniture: currentFurniture,
          selectedId: selectedIdRef.current,
          nextPosition: {
            x: position.x,
            z: position.z,
          },
          bounds,
          edgeSnapThreshold,
        })

        if (!result.ok) {
          return result
        }

        const nextHistory = applyMoveSelectionResultToHistory({
          history: historyRef.current,
          result,
          commit,
          baseline:
            commit === 'immediate'
              ? (deferredMoveBaselineRef.current ?? undefined)
              : undefined,
        })

        if (commit === 'defer' && !deferredMoveBaselineRef.current) {
          deferredMoveBaselineRef.current = historyRef.current.present
        }
        if (commit === 'immediate') {
          deferredMoveBaselineRef.current = null
        }

        historyRef.current = nextHistory
        setHistory(nextHistory)

        return result
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
        deferredMoveBaselineRef.current = null
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
        deferredMoveBaselineRef.current = null
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
        deferredMoveBaselineRef.current = null
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
        deferredMoveBaselineRef.current = null
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
