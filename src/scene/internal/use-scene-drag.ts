import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { type ThreeEvent } from '@react-three/fiber'
import {
  getFloorIntersection,
  getDraggedFurniturePosition,
} from '@/lib/three/furniture-drag'
import {
  resolveMovedFurniturePosition,
  type LayoutBounds,
} from '@/lib/three/furniture-layout'
import {
  finalizeHistoryPresent,
  type HistoryState,
} from '@/lib/ui/editor-history'
import type { FurnitureItem } from '../objects/furniture.types'

interface DragState {
  id: string
  pointerId: number
  offset: {
    x: number
    z: number
  }
}

interface SceneDragState {
  clearDragState: () => void
  dragState: DragState | null
  handleDragEnd: (id: string) => void
  handleDragStart: (id: string, event: ThreeEvent<PointerEvent>) => void
  handleMove: (id: string, event: ThreeEvent<PointerEvent>) => void
}

export function useSceneDrag({
  furniture,
  selectFurniture,
  updateFurniturePosition,
  setHistory,
  bounds,
  floorPlaneY,
  snapSize,
  edgeSnapThreshold,
  areFurnitureCollectionsEqual,
}: {
  furniture: FurnitureItem[]
  selectFurniture: (id: string | null) => void
  updateFurniturePosition: (
    id: string,
    nextPosition: [number, number, number],
  ) => void
  setHistory: Dispatch<SetStateAction<HistoryState<FurnitureItem[]>>>
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

  const clearDragState = useCallback(() => {
    setDragState(null)
    dragStartStateRef.current = null
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

      selectFurniture(id)
      dragStartStateRef.current = furniture
      setDragState({
        id,
        pointerId: event.pointerId,
        offset: {
          x: activeFurniture.position[0] - floorIntersection.x,
          z: activeFurniture.position[2] - floorIntersection.z,
        },
      })
    },
    [floorPlaneY, furniture, selectFurniture],
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
        return
      }

      setHistory((currentHistory) =>
        finalizeHistoryPresent(
          currentHistory,
          dragStartState,
          areFurnitureCollectionsEqual,
        ),
      )
    },
    [areFurnitureCollectionsEqual, dragState, setHistory],
  )

  return {
    clearDragState,
    dragState,
    handleDragEnd,
    handleDragStart,
    handleMove,
  }
}
