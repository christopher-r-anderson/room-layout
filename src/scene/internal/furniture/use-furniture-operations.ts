import { useCallback } from 'react'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
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
import { getLoadedCollectionScenes } from './collection-scene-registry'
import type {
  AddFurnitureResult,
  MoveSelectionResult,
  MoveSource,
  UpdateSelectionTransformResult,
} from '@/core/scene.types'

interface UseFurnitureOperationsOptions {
  dragState: { id: string } | null
  clearDragState: () => void
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
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
  bounds,
  edgeSnapThreshold,
  snapSize,
}: UseFurnitureOperationsOptions) {
  const deleteSelection = useCallback(() => {
    const { history, selectedId } = useSceneDocumentStore.getState()
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
      const { history, selectedId } = useSceneDocumentStore.getState()
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
      const { history, selectedId } = useSceneDocumentStore.getState()
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
      const { history, selectedId } = useSceneDocumentStore.getState()
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
      const { history, instanceIdCounter } = useSceneDocumentStore.getState()
      const operationResult = addFurnitureToHistory({
        history,
        // Read the freshly parsed collection scenes at call time: the add flow
        // awaits ensureCollectionLoaded before dispatching, so the collection is
        // in the store even if React has not re-rendered Scene yet.
        sourceScenesByPath: getLoadedCollectionScenes(),
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
    [catalog, collections, bounds, edgeSnapThreshold, snapSize],
  )

  return {
    deleteSelection,
    moveSelection,
    setSelectionTransform,
    rotateSelection,
    addFurniture,
  }
}
