import { useCallback, useEffect, useRef, useState } from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { sceneSessionActions } from '@/core/stores/scene-session-store'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import {
  getFloorIntersection,
  getDraggedFurniturePosition,
} from './furniture-drag'
import {
  resolveMovedFurniturePosition,
  type LayoutBounds,
} from '@/domain/geometry/furniture-layout'
import {
  finalizeHistoryPresent,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'

interface DragState {
  id: string
  pointerId: number
  offset: {
    x: number
    z: number
  }
}

interface SceneDragState {
  dragState: DragState | null
  handleDragEnd: (id: string) => void
  handleDragStart: (id: string, event: ThreeEvent<PointerEvent>) => void
  handleMove: (id: string, event: ThreeEvent<PointerEvent>) => void
}

export function useSceneDrag({
  furniture,
  updateFurniturePosition,
  updateHistory,
  bounds,
  floorPlaneY,
  snapSize,
  edgeSnapThreshold,
  areFurnitureCollectionsEqual,
}: {
  furniture: FurnitureItem[]
  updateFurniturePosition: (
    id: string,
    nextPosition: [number, number, number],
  ) => void
  updateHistory: (
    updater: (
      history: HistoryState<FurnitureItem[]>,
    ) => HistoryState<FurnitureItem[]>,
  ) => void
  bounds: LayoutBounds
  floorPlaneY: number
  snapSize: number
  edgeSnapThreshold: number
  areFurnitureCollectionsEqual: (
    left: FurnitureItem[],
    right: FurnitureItem[],
  ) => boolean
}): SceneDragState {
  const dragStartStateRef = useRef<FurnitureItem[] | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  // The session's isDragging flag is written synchronously with the gesture so
  // core mutations guarding on it never race a pending render.
  const clearDragState = useCallback(() => {
    setDragState(null)
    dragStartStateRef.current = null
    sceneSessionActions.setDragging(false)
  }, [])

  // A dragged item can be deleted out from under the gesture (keyboard delete);
  // the gesture must not keep the drag flag or stale start state alive. The
  // boolean existence selector keeps the listener quiet across the drag's own
  // per-move history writes - it fires only when membership flips.
  useEffect(() => {
    if (!dragState) {
      return
    }

    return useSceneDocumentStore.subscribe(
      (state) => state.history.present.some((item) => item.id === dragState.id),
      (itemExists) => {
        if (!itemExists) {
          clearDragState()
        }
      },
    )
  }, [clearDragState, dragState])

  // The gesture dies with the scene: a mid-drag unmount (retry teardown, error
  // boundary) must not leave the session flagged as dragging.
  useEffect(() => {
    return () => {
      sceneSessionActions.setDragging(false)
    }
  }, [])

  const handleDragStart = useCallback(
    (id: string, event: ThreeEvent<PointerEvent>) => {
      const activeFurniture = furniture.find((item) => item.id === id)

      if (!activeFurniture) {
        return
      }

      const floorIntersection = getFloorIntersection(event.ray, floorPlaneY)

      if (!floorIntersection) {
        return
      }

      selectByCanvasPointer(id)
      dragStartStateRef.current = furniture
      sceneSessionActions.setDragging(true)
      setDragState({
        id,
        pointerId: event.pointerId,
        offset: {
          x: activeFurniture.position[0] - floorIntersection.x,
          z: activeFurniture.position[2] - floorIntersection.z,
        },
      })
    },
    [floorPlaneY, furniture],
  )

  const handleMove = useCallback(
    (id: string, event: ThreeEvent<PointerEvent>) => {
      if (dragState?.id !== id || dragState.pointerId !== event.pointerId) {
        return
      }

      const activeFurniture = furniture.find((item) => item.id === id)

      if (!activeFurniture) {
        return
      }

      const nextPosition = getDraggedFurniturePosition({
        ray: event.ray,
        currentY: activeFurniture.position[1],
        dragOffset: dragState.offset,
        bounds,
        snapSize,
        planeY: floorPlaneY,
      })

      if (!nextPosition) {
        return
      }

      const resolvedPosition = resolveMovedFurniturePosition({
        movingId: id,
        proposedPosition: nextPosition,
        items: furniture,
        edgeSnapThreshold,
        bounds,
      })

      if (!resolvedPosition) {
        return
      }

      updateFurniturePosition(id, resolvedPosition)
    },
    [
      bounds,
      dragState,
      edgeSnapThreshold,
      floorPlaneY,
      furniture,
      snapSize,
      updateFurniturePosition,
    ],
  )

  const handleDragEnd = useCallback(
    (id: string) => {
      if (dragState?.id !== id) {
        return
      }

      setDragState(null)

      const dragStartState = dragStartStateRef.current
      dragStartStateRef.current = null

      if (!dragStartState) {
        sceneSessionActions.setDragging(false)
        return
      }

      updateHistory((currentHistory) =>
        finalizeHistoryPresent(
          currentHistory,
          dragStartState,
          areFurnitureCollectionsEqual,
        ),
      )
      sceneSessionActions.setDragging(false)
    },
    [areFurnitureCollectionsEqual, dragState, updateHistory],
  )

  return {
    dragState,
    handleDragEnd,
    handleDragStart,
    handleMove,
  }
}
