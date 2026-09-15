import { describe, expect, it } from 'vitest'
import {
  getContourXAtY,
  getContourXInYRange,
  getContourYAtX,
  getContourYInXRange,
  getConvexHull,
  getPointBounds,
  rectIntersectsPolygon,
  type ScreenPoint,
} from './convex-geometry'
import type { Rect } from './rect-utils'

// A 10x10 axis-aligned square, given as its four corners.
const SQUARE: ScreenPoint[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): Rect => ({ left, top, width, height })

describe('getConvexHull', () => {
  it('returns the input unchanged for zero or one point', () => {
    expect(getConvexHull([])).toEqual([])
    expect(getConvexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }])
  })

  it('drops interior points, keeping only the boundary', () => {
    const hull = getConvexHull([...SQUARE, { x: 5, y: 5 }])

    expect(hull).toHaveLength(4)
    expect(hull).toEqual(expect.arrayContaining(SQUARE))
    expect(hull).not.toContainEqual({ x: 5, y: 5 })
  })

  it('collapses collinear points to the two endpoints', () => {
    const hull = getConvexHull([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ])

    expect(hull).toHaveLength(2)
    expect(hull).toEqual(
      expect.arrayContaining([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    )
  })
})

describe('rectIntersectsPolygon', () => {
  it('is false for an empty polygon', () => {
    expect(rectIntersectsPolygon(rect(0, 0, 1, 1), [])).toBe(false)
  })

  it('detects a rect contained within the polygon', () => {
    expect(rectIntersectsPolygon(rect(2, 2, 2, 2), SQUARE)).toBe(true)
  })

  it('detects a polygon vertex falling inside the rect', () => {
    expect(rectIntersectsPolygon(rect(-2, -2, 5, 5), SQUARE)).toBe(true)
  })

  it('is false for a disjoint rect', () => {
    expect(rectIntersectsPolygon(rect(20, 20, 5, 5), SQUARE)).toBe(false)
  })
})

describe('contour queries', () => {
  it('reads the top/bottom contour at a vertical slice', () => {
    expect(getContourYAtX(SQUARE, 5, 'top')).toBe(0)
    expect(getContourYAtX(SQUARE, 5, 'bottom')).toBe(10)
  })

  it('reads the left/right contour at a horizontal slice', () => {
    expect(getContourXAtY(SQUARE, 5, 'left')).toBe(0)
    expect(getContourXAtY(SQUARE, 5, 'right')).toBe(10)
  })

  it('returns null when the slice misses the polygon', () => {
    expect(getContourYAtX(SQUARE, 50, 'top')).toBeNull()
    expect(getContourXAtY(SQUARE, 50, 'left')).toBeNull()
  })

  it('reduces the contour across a range to the extreme edge', () => {
    expect(getContourYInXRange(SQUARE, 2, 8, 'top')).toBe(0)
    expect(getContourYInXRange(SQUARE, 2, 8, 'bottom')).toBe(10)
    expect(getContourXInYRange(SQUARE, 2, 8, 'left')).toBe(0)
    expect(getContourXInYRange(SQUARE, 2, 8, 'right')).toBe(10)
  })
})

describe('getPointBounds', () => {
  it('returns null for no points', () => {
    expect(getPointBounds([])).toBeNull()
  })

  it('computes the bounding box and center', () => {
    expect(getPointBounds(SQUARE)).toEqual({
      left: 0,
      top: 0,
      right: 10,
      bottom: 10,
      width: 10,
      height: 10,
      centerX: 5,
      centerY: 5,
    })
  })
})
