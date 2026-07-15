import { expect, it } from 'vitest'
import {
  clampRoomSize,
  DEFAULT_ROOM_SIZE,
  getRoomLayoutBounds,
  isRoomSizeWithinLimits,
} from './room-metrics'

it('derives origin-centered layout bounds from the room size', () => {
  expect(getRoomLayoutBounds({ width: 8, depth: 5 })).toEqual({
    minX: -4,
    maxX: 4,
    minZ: -2.5,
    maxZ: 2.5,
  })
})

it('clamps each dimension into its limits independently', () => {
  expect(clampRoomSize({ width: 1, depth: 25, height: 3 })).toEqual({
    width: 2,
    depth: 20,
    height: 3,
  })
})

it('accepts the default room size as within limits', () => {
  expect(isRoomSizeWithinLimits(DEFAULT_ROOM_SIZE)).toBe(true)
})

it('rejects a room size with any dimension out of range', () => {
  expect(isRoomSizeWithinLimits({ width: 1.9, depth: 6, height: 2.5 })).toBe(
    false,
  )
  expect(isRoomSizeWithinLimits({ width: 6, depth: 20.1, height: 2.5 })).toBe(
    false,
  )
  expect(isRoomSizeWithinLimits({ width: 6, depth: 6, height: 5.5 })).toBe(
    false,
  )
})
