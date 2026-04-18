import {
  useImperativeHandle,
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
  removeSelectionFromHistory,
  type AddFurnitureResult,
} from './furniture-operations'
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
  useImperativeHandle(
    ref,
    () => ({
      clearSelection: () => {
        if (!dragState) {
          selectFurniture(null)
        }
      },
      rotateSelection: (deltaRadians: number) => {
        rotateSelectedFurniture(deltaRadians)
      },
      addFurniture: (catalogId: string) => {
        const addOutcome: {
          result: AddFurnitureResult
          incrementInstanceId: boolean
        } = {
          result: {
            ok: false,
            reason: 'no-space',
          },
          incrementInstanceId: false,
        }

        setHistory((currentHistory) => {
          const operationResult = addFurnitureToHistory({
            history: currentHistory,
            sourceScenesByPath,
            catalogId,
            nextId: createFurnitureInstanceId(instanceIdRef.current + 1),
            bounds,
            edgeSnapThreshold,
            snapSize,
          })

          addOutcome.result = operationResult.result
          addOutcome.incrementInstanceId = operationResult.incrementInstanceId

          return operationResult.history
        })

        if (addOutcome.incrementInstanceId) {
          instanceIdRef.current += 1
          setSelectedIdAndResolveObject(
            addOutcome.result.ok ? addOutcome.result.id : null,
          )
        }

        return addOutcome.result
      },
      removeSelection: () => {
        const removeOutcome = {
          removed: false,
          removedId: null as string | null,
        }

        setHistory((currentHistory) => {
          const operationResult = removeSelectionFromHistory(
            currentHistory,
            selectedId,
          )

          removeOutcome.removed = operationResult.removed
          removeOutcome.removedId = operationResult.removedId

          return operationResult.history
        })

        if (!removeOutcome.removed) {
          return false
        }

        if (
          removeOutcome.removedId &&
          dragState?.id === removeOutcome.removedId
        ) {
          clearDragState()
        }

        setSelectedIdAndResolveObject(null)

        return true
      },
      undo: () => {
        const undoResult = undoSceneHistory({
          history,
          selectedId,
          isDragging: Boolean(dragState),
        })

        if (!undoResult.didChange) {
          return false
        }

        setHistory(undoResult.history)
        setSelectedIdAndResolveObject(undoResult.selectedId)

        return true
      },
      redo: () => {
        const redoResult = redoSceneHistory({
          history,
          selectedId,
          isDragging: Boolean(dragState),
        })

        if (!redoResult.didChange) {
          return false
        }

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
      dragState,
      furniture,
      history,
      objectRefs,
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
