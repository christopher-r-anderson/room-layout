import { useCallback } from 'react'
import type { Object3D } from 'three'
import {
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/scene-contracts'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import { type LayoutBounds } from '@/domain/geometry/furniture-layout'
import {
  addFurnitureToHistory,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
  resolveMoveSelectionInHistory,
  resolveSetSelectionTransformInHistory,
  rotateSelectedFurnitureInHistory,
} from './furniture-operations'
import type {
  AddFurnitureResult,
  MoveSelectionResult,
  MoveSource,
  UpdateSelectionTransformResult,
} from '../../scene.types'

interface UseFurnitureOperationsOptions {
  dragState: { id: string } | null
  clearDragState: () => void
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  sourceScenesByPath: Map<string, Object3D>
  bounds: LayoutBounds
  edgeSnapThreshold: number
  snapSize: number
}

// Furniture mutation service handlers: move/transform/rotate/add/delete. Each
// reads the authoritative history, runs the pure placement resolution and
// history transition (collision/bounds math lives in domain/geometry and
// furniture-operations), then writes the result back. Drag-guarded throughout.
export function useFurnitureOperations({
  dragState,
  clearDragState,
  catalog,
  collections,
  sourceScenesByPath,
  bounds,
  edgeSnapThreshold,
  snapSize,
}: UseFurnitureOperationsOptions) {
  const deleteSelection = useCallback(() => {
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

  const moveSelection = useCallback(
    (
      delta: { x: number; z: number },
      _options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      void _options
      const { history, selectedId } = sceneDocumentStore.getState()
      const { history: nextHistory, result } = resolveMoveSelectionInHistory({
        history,
        selectedId,
        isDragging: dragState !== null,
        delta,
        bounds,
        edgeSnapThreshold,
      })

      if (result.ok) {
        sceneDocumentActions.setHistory(nextHistory)
      }

      return result
    },
    [dragState, bounds, edgeSnapThreshold],
  )

  const setSelectionTransform = useCallback(
    (input: {
      position?: [number, number, number]
      rotationY?: number
    }): UpdateSelectionTransformResult => {
      const { history, selectedId } = sceneDocumentStore.getState()
      const { history: nextHistory, result } =
        resolveSetSelectionTransformInHistory({
          history,
          selectedId,
          isDragging: dragState !== null,
          input,
          bounds,
        })

      if (result.ok) {
        sceneDocumentActions.setHistory(nextHistory)
      }

      return result
    },
    [dragState, bounds],
  )

  const rotateSelection = useCallback(
    (deltaRadians: number) => {
      const { history, selectedId } = sceneDocumentStore.getState()
      const nextHistory = rotateSelectedFurnitureInHistory({
        history,
        selectedId,
        deltaRadians,
        bounds,
      })

      sceneDocumentActions.setHistory(nextHistory)
    },
    [bounds],
  )

  const addFurniture = useCallback(
    (catalogId: string): AddFurnitureResult => {
      const { history, instanceIdCounter } = sceneDocumentStore.getState()
      const operationResult = addFurnitureToHistory({
        history,
        sourceScenesByPath,
        catalogId,
        nextId: createFurnitureInstanceId(instanceIdCounter + 1),
        catalog,
        collections,
        bounds,
        edgeSnapThreshold,
        snapSize,
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
    [
      catalog,
      collections,
      sourceScenesByPath,
      bounds,
      edgeSnapThreshold,
      snapSize,
    ],
  )

  return {
    deleteSelection,
    moveSelection,
    setSelectionTransform,
    rotateSelection,
    addFurniture,
  }
}
