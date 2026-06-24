import { useCallback } from 'react'
import type { Object3D } from 'three'
import { commitHistoryPresent } from '@/shared/lib/ui/editor-history'
import {
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/scene-contracts'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import {
  resolveAbsoluteFurnitureTransform,
  resolveMovedFurniturePosition,
  type LayoutBounds,
} from '@/domain/geometry/furniture-layout'
import {
  addFurnitureToHistory,
  areFurnitureCollectionsEqual,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
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
    [dragState, bounds, edgeSnapThreshold],
  )

  const setSelectionTransform = useCallback(
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
        bounds,
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
