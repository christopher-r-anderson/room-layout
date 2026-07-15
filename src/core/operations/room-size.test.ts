import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import { makeFurnitureItem } from '@/test/support/furniture'
import {
  getCurrentRoomLayoutBounds,
  moveItemsInsideRoom,
  setRoomSize,
} from './room-size'

function resetAllStores() {
  resetSceneDocumentStore()
  resetSceneSessionStore()
}

beforeEach(resetAllStores)
afterEach(resetAllStores)

it('setRoomSize stores the rounded size and reports no out-of-bounds items in an empty room', () => {
  const result = setRoomSize({ width: 4.0004, depth: 5, height: 2.5 })

  expect(result).toEqual({ ok: true, outOfBoundsCount: 0 })
  expect(useSceneDocumentStore.getState().roomSize).toEqual({
    width: 4,
    depth: 5,
    height: 2.5,
  })
  expect(getCurrentRoomLayoutBounds()).toEqual({
    minX: -2,
    maxX: 2,
    minZ: -2.5,
    maxZ: 2.5,
  })
})

it('setRoomSize rejects out-of-range dimensions without touching the store', () => {
  const result = setRoomSize({ width: 1, depth: 6, height: 2.5 })

  expect(result).toEqual({ ok: false, reason: 'out-of-range' })
  expect(useSceneDocumentStore.getState().roomSize).toEqual(DEFAULT_ROOM_SIZE)
})

it('setRoomSize refuses to run mid-drag', () => {
  sceneSessionActions.setDragging(true)

  const result = setRoomSize({ width: 4, depth: 4, height: 2.5 })

  expect(result).toEqual({ ok: false, reason: 'dragging' })
  expect(useSceneDocumentStore.getState().roomSize).toEqual(DEFAULT_ROOM_SIZE)
})

it('setRoomSize leaves furniture untouched and counts items outside the smaller room', () => {
  const nearWall = makeFurnitureItem({ id: 'near-wall', position: [2.5, 0, 0] })
  const centered = makeFurnitureItem({ id: 'centered', position: [0, 0, 0] })
  const history = createHistoryState([nearWall, centered])
  sceneDocumentActions.setHistory(history)

  const result = setRoomSize({ width: 4, depth: 4, height: 2.5 })

  expect(result).toEqual({ ok: true, outOfBoundsCount: 1 })
  // Shrinking never moves items and never commits history.
  expect(useSceneDocumentStore.getState().history).toBe(history)
})

it('moveItemsInsideRoom pulls flagged items in as one undoable step', () => {
  const nearWall = makeFurnitureItem({ id: 'near-wall', position: [2.5, 0, 0] })
  const centered = makeFurnitureItem({ id: 'centered', position: [0, 0, 0] })
  sceneDocumentActions.setHistory(createHistoryState([nearWall, centered]))
  setRoomSize({ width: 4, depth: 4, height: 2.5 })

  const result = moveItemsInsideRoom()

  expect(result).toEqual({ ok: true, movedCount: 1 })
  const { history } = useSceneDocumentStore.getState()
  expect(history.present[0].position).toEqual([1.5, 0, 0])
  expect(history.present[1]).toBe(centered)
  expect(history.past).toHaveLength(1)
  expect(history.past[0][0]).toBe(nearWall)
})

it('moveItemsInsideRoom is a no-op when everything already fits', () => {
  const history = createHistoryState([makeFurnitureItem()])
  sceneDocumentActions.setHistory(history)

  const result = moveItemsInsideRoom()

  expect(result).toEqual({ ok: true, movedCount: 0 })
  expect(useSceneDocumentStore.getState().history).toBe(history)
})

it('moveItemsInsideRoom refuses to run mid-drag', () => {
  sceneSessionActions.setDragging(true)

  expect(moveItemsInsideRoom()).toEqual({ ok: false, reason: 'dragging' })
})
