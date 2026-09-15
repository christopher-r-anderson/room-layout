import { describe, expect, it } from 'vitest'
import {
  adjustRectToContainer,
  createRectFromAnchor,
  getAttachmentDistance,
  getCandidateAnchors,
} from './toolbar-anchors'
import {
  getPointBounds,
  type PointBounds,
  type ScreenPoint,
} from './convex-geometry'
import type { Rect } from './rect-utils'

// A 10x10 square silhouette; its hull and corner points coincide.
const SQUARE: ScreenPoint[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]
const TOOLBAR = { width: 4, height: 2 }

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

describe('createRectFromAnchor', () => {
  // TOOLBAR_GAP is 12; the rect is centered on the anchor and offset past the
  // contour edge by that gap.
  it('places a bottom toolbar below the contour', () => {
    const rect = createRectFromAnchor(
      { x: 5, y: 10 },
      SQUARE,
      'bottom',
      TOOLBAR,
    )
    expect(rect).toEqual({ left: 3, top: 22, width: 4, height: 2 })
  })

  it('places a top toolbar above the contour', () => {
    const rect = createRectFromAnchor({ x: 5, y: 0 }, SQUARE, 'top', TOOLBAR)
    expect(rect).toEqual({ left: 3, top: -14, width: 4, height: 2 })
  })

  it('places a right toolbar past the contour', () => {
    const rect = createRectFromAnchor({ x: 10, y: 5 }, SQUARE, 'right', TOOLBAR)
    expect(rect).toEqual({ left: 22, top: 4, width: 4, height: 2 })
  })
})

describe('adjustRectToContainer', () => {
  const container = domRect({
    right: 100,
    bottom: 100,
    width: 100,
    height: 100,
  })

  it('clamps horizontally for top/bottom sides and reports the shift', () => {
    const rect: Rect = { left: 95, top: 10, width: 20, height: 5 }
    const { rect: adjusted, clampShift } = adjustRectToContainer(
      rect,
      'bottom',
      container,
    )
    // max left = right(100) - width(20) - padding(12) = 68.
    expect(adjusted.left).toBe(68)
    expect(clampShift).toBe(27)
  })

  it('clamps vertically for left/right sides', () => {
    const rect: Rect = { left: 10, top: 95, width: 5, height: 20 }
    const { rect: adjusted, clampShift } = adjustRectToContainer(
      rect,
      'left',
      container,
    )
    expect(adjusted.top).toBe(68)
    expect(clampShift).toBe(27)
  })

  it('leaves an in-bounds rect untouched with no shift', () => {
    const rect: Rect = { left: 30, top: 10, width: 20, height: 5 }
    const { rect: adjusted, clampShift } = adjustRectToContainer(
      rect,
      'bottom',
      container,
    )
    expect(adjusted.left).toBe(30)
    expect(clampShift).toBe(0)
  })
})

describe('getAttachmentDistance', () => {
  it('measures rect-center to anchor distance', () => {
    const rect: Rect = { left: 0, top: 0, width: 10, height: 10 }
    expect(getAttachmentDistance(rect, { x: 5, y: 5 })).toBe(0)
    expect(getAttachmentDistance(rect, { x: 8, y: 5 })).toBe(3)
  })
})

describe('getCandidateAnchors', () => {
  it('resolves all twelve candidate anchors for a visible silhouette', () => {
    const bounds = getPointBounds(SQUARE)
    if (bounds === null) {
      throw new Error('expected bounds for a non-empty silhouette')
    }
    const candidates = getCandidateAnchors(SQUARE, bounds, SQUARE)

    expect(candidates).toHaveLength(12)
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'top-center',
      'top-left',
      'top-right',
      'bottom-center',
      'bottom-left',
      'bottom-right',
      'right-center',
      'right-upper',
      'right-lower',
      'left-center',
      'left-upper',
      'left-lower',
    ])
    expect(
      candidates.find((candidate) => candidate.id === 'top-center')?.anchor,
    ).toEqual({ x: 5, y: 0 })
  })

  it('returns no candidates when there are no silhouette points', () => {
    const emptyBounds: PointBounds = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    }

    expect(getCandidateAnchors([], emptyBounds, [])).toEqual([])
  })
})
