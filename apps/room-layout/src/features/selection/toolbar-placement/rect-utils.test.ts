import { describe, expect, it } from 'vitest'
import {
  avoidsExclusions,
  clamp,
  fitsContainer,
  getContainerRect,
  getDomRectBottom,
  getDomRectRight,
  getRectBottom,
  getRectCorners,
  getRectDistance,
  getRectIntersectionArea,
  getRectRight,
  inflateRect,
  toAbsoluteRect,
  type Rect,
} from './rect-utils'

function domRect(overrides: Partial<DOMRectReadOnly>): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
    ...overrides,
  }
}

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): Rect => ({ left, top, width, height })

describe('rect edge accessors', () => {
  it('derives right/bottom from origin and size', () => {
    expect(getRectRight({ left: 10, width: 30 })).toBe(40)
    expect(getRectBottom({ top: 5, height: 15 })).toBe(20)
  })

  it('uses a DOMRect right/bottom when present, else falls back to origin+size', () => {
    expect(getDomRectRight(domRect({ right: 100 }))).toBe(100)
    expect(getDomRectRight(domRect({ right: 0, left: 10, width: 90 }))).toBe(
      100,
    )
    expect(getDomRectBottom(domRect({ bottom: 50 }))).toBe(50)
    expect(getDomRectBottom(domRect({ bottom: 0, top: 5, height: 45 }))).toBe(
      50,
    )
  })
})

describe('clamp', () => {
  it('keeps values inside the range and pins out-of-range values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('returns the min when the range is inverted', () => {
    expect(clamp(5, 10, 0)).toBe(10)
  })
})

describe('fitsContainer', () => {
  const container = domRect({
    right: 1000,
    bottom: 1000,
    width: 1000,
    height: 1000,
  })

  it('accepts a rect inside the padded container', () => {
    expect(fitsContainer(rect(100, 100, 200, 200), container)).toBe(true)
  })

  it('rejects a rect that violates the viewport padding', () => {
    expect(fitsContainer(rect(5, 100, 200, 200), container)).toBe(false)
  })
})

describe('avoidsExclusions', () => {
  const target = rect(0, 0, 10, 10)

  it('is true when no exclusion overlaps', () => {
    expect(avoidsExclusions(target, [rect(20, 20, 5, 5)])).toBe(true)
  })

  it('is false when an exclusion overlaps', () => {
    expect(avoidsExclusions(target, [rect(5, 5, 10, 10)])).toBe(false)
  })

  it('treats edge-touching rects as non-overlapping', () => {
    expect(avoidsExclusions(target, [rect(10, 0, 10, 10)])).toBe(true)
  })
})

describe('getRectIntersectionArea', () => {
  it('returns the overlap area for intersecting rects', () => {
    expect(
      getRectIntersectionArea(rect(0, 0, 10, 10), rect(5, 5, 10, 10)),
    ).toBe(25)
  })

  it('returns 0 for disjoint rects', () => {
    expect(
      getRectIntersectionArea(rect(0, 0, 10, 10), rect(20, 20, 5, 5)),
    ).toBe(0)
  })
})

describe('getRectDistance', () => {
  it('measures the gap between disjoint rects', () => {
    expect(getRectDistance(rect(0, 0, 10, 10), rect(30, 0, 10, 10))).toBe(20)
  })

  it('is 0 for overlapping rects', () => {
    expect(getRectDistance(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(0)
  })
})

describe('rect transforms', () => {
  it('lists corners clockwise from the top-left', () => {
    expect(getRectCorners(rect(1, 2, 3, 4))).toEqual([
      { x: 1, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 6 },
      { x: 1, y: 6 },
    ])
  })

  it('inflates a rect outward on every side', () => {
    expect(inflateRect(rect(10, 10, 20, 20), 5)).toEqual(rect(5, 5, 30, 30))
  })

  it('maps a DOMRect to a plain rect', () => {
    const source = domRect({ left: 1, top: 2, width: 3, height: 4 })
    expect(getContainerRect(source)).toEqual(rect(1, 2, 3, 4))
    expect(toAbsoluteRect(source)).toEqual(rect(1, 2, 3, 4))
  })
})
