import { useMemo } from 'react'
import {
  clampItemsToLayoutBounds,
  getOutOfBoundsItemIds,
  getOversizedItemIds,
  type LayoutBounds,
} from '@/domain/geometry/furniture-layout'
import {
  getRoomLayoutBounds,
  isRoomSizeWithinLimits,
  type RoomSize,
} from '@/domain/geometry/room-metrics'
import { commitHistoryPresent } from '@/shared/lib/ui/editor-history'
import { roundRoomSize } from '@/core/persistence/furniture-serialization'
import {
  getRoomSize,
  sceneDocumentActions,
  useItems,
  useRoomSize,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'

export type SetRoomSizeResult =
  | { ok: true; outOfBoundsCount: number }
  | { ok: false; reason: 'dragging' | 'out-of-range' }

export type MoveItemsInsideRoomResult =
  | { ok: true; movedCount: number }
  | { ok: false; reason: 'dragging' }

/**
 * Sets the scene's room size. Never mutates furniture: items left outside the
 * new walls stay put (reported via `outOfBoundsCount`) and are fixed by the
 * user - dragging re-clamps them, or {@link moveItemsInsideRoom} pulls them
 * all in at once.
 */
export function setRoomSize(next: RoomSize): SetRoomSizeResult {
  // Resizing mid-drag would swap the drag gesture's bounds under it.
  if (useSceneSessionStore.getState().isDragging) {
    return { ok: false, reason: 'dragging' }
  }

  const rounded = roundRoomSize(next)

  if (!isRoomSizeWithinLimits(rounded)) {
    return { ok: false, reason: 'out-of-range' }
  }

  sceneDocumentActions.setRoomSize(rounded)

  const { history } = useSceneDocumentStore.getState()
  const outOfBoundsCount = getOutOfBoundsItemIds(
    history.present,
    getRoomLayoutBounds(rounded),
  ).length

  return { ok: true, outOfBoundsCount }
}

/** Pulls every out-of-bounds item back inside the room as one undoable step. */
export function moveItemsInsideRoom(): MoveItemsInsideRoomResult {
  if (useSceneSessionStore.getState().isDragging) {
    return { ok: false, reason: 'dragging' }
  }

  const { history, roomSize } = useSceneDocumentStore.getState()
  const { items, movedCount } = clampItemsToLayoutBounds(
    history.present,
    getRoomLayoutBounds(roomSize),
  )

  if (movedCount > 0) {
    sceneDocumentActions.setHistory(commitHistoryPresent(history, items))
  }

  return { ok: true, movedCount }
}

export function useRoomLayoutBounds(): LayoutBounds {
  const roomSize = useRoomSize()

  return useMemo(() => getRoomLayoutBounds(roomSize), [roomSize])
}

/** Non-reactive peer of {@link useRoomLayoutBounds} for use outside React. */
export function getCurrentRoomLayoutBounds(): LayoutBounds {
  return getRoomLayoutBounds(getRoomSize())
}

/** Ids of items whose footprint pokes past the current room's walls. */
export function useOutOfBoundsItemIds(): string[] {
  const items = useItems()
  const bounds = useRoomLayoutBounds()

  return useMemo(() => getOutOfBoundsItemIds(items, bounds), [items, bounds])
}

export interface OutOfBoundsStatus {
  outOfBoundsCount: number
  /** Items larger than the room: pulling them inside can only center them. */
  oversizedCount: number
  /** Whether {@link moveItemsInsideRoom} would change any position. */
  canMoveInside: boolean
}

/** The Size tab's read model for the out-of-bounds warning row. */
export function useOutOfBoundsStatus(): OutOfBoundsStatus {
  const items = useItems()
  const bounds = useRoomLayoutBounds()

  return useMemo(
    () => ({
      outOfBoundsCount: getOutOfBoundsItemIds(items, bounds).length,
      oversizedCount: getOversizedItemIds(items, bounds).length,
      canMoveInside: clampItemsToLayoutBounds(items, bounds).movedCount > 0,
    }),
    [items, bounds],
  )
}
