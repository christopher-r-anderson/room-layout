import { describe, expect, it } from 'vitest'
import { getFloorTextureRepeat } from './floor-texture-repeat'

describe('getFloorTextureRepeat', () => {
  it('computes repeat from room and physical tile dimensions', () => {
    const repeat = getFloorTextureRepeat({
      roomWidthMeters: 6,
      roomDepthMeters: 6,
      tileWidthMeters: 2,
      tileDepthMeters: 2,
    })

    expect(repeat).toEqual({ x: 3, y: 3 })
  })

  it('supports non-square tile dimensions', () => {
    const repeat = getFloorTextureRepeat({
      roomWidthMeters: 8,
      roomDepthMeters: 6,
      tileWidthMeters: 2,
      tileDepthMeters: 1.5,
    })

    expect(repeat).toEqual({ x: 4, y: 4 })
  })

  it('throws when any dimension is invalid', () => {
    expect(() =>
      getFloorTextureRepeat({
        roomWidthMeters: 0,
        roomDepthMeters: 6,
        tileWidthMeters: 2,
        tileDepthMeters: 2,
      }),
    ).toThrow(RangeError)

    expect(() =>
      getFloorTextureRepeat({
        roomWidthMeters: 6,
        roomDepthMeters: 6,
        tileWidthMeters: Number.POSITIVE_INFINITY,
        tileDepthMeters: 2,
      }),
    ).toThrow(RangeError)
  })
})
