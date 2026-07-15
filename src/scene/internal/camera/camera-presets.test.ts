import { expect, it } from 'vitest'
import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import { getCameraMaxDistance, getCameraPresetViews } from './camera-presets'

it('reproduces the views tuned for the default 6x6 room', () => {
  expect(getCameraPresetViews(DEFAULT_ROOM_SIZE)).toEqual({
    corner: { position: [6, 6, 6], target: [0, 0, 0] },
    front: { position: [0, 2, 9], target: [0, 1, 0] },
    side: { position: [9, 2, 0], target: [0, 1, 0] },
    top: { position: [0, 10, 0.001], target: [0, 0, 0] },
  })
})

it('scales the preset distances with the larger room dimension', () => {
  const views = getCameraPresetViews({ width: 12, depth: 8, height: 2.5 })

  expect(views.corner.position).toEqual([12, 12, 8])
  expect(views.front.position).toEqual([0, 2, 12])
  expect(views.side.position).toEqual([18, 2, 0])
  expect(views.top.position).toEqual([0, 20, 0.001])
})

it('keeps the default max orbit distance and clamps it for extreme sizes', () => {
  expect(getCameraMaxDistance(DEFAULT_ROOM_SIZE)).toBe(12)
  expect(getCameraMaxDistance({ width: 2, depth: 2, height: 2.5 })).toBe(8)
  expect(getCameraMaxDistance({ width: 20, depth: 20, height: 2.5 })).toBe(40)
})
