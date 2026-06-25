import { describe, expect, it } from 'vitest'
import { computeSelectedToolbarPlacement } from './selected-toolbar-placement'

const CONTAINER_RECT = {
  left: 0,
  top: 0,
  width: 800,
  height: 600,
} as DOMRectReadOnly

describe('computeSelectedToolbarPlacement', () => {
  it('places the toolbar above the selected bounds when space is available', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 360, y: 280 },
        { x: 440, y: 280 },
        { x: 360, y: 340 },
        { x: 440, y: 340 },
      ],
      sourcePointCount: 8,
      projectedPointCount: 4,
      source: 'render-bounds',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.side).toBe('top')
    expect(placement.candidateId).toBe('top-center')
    expect(placement.left).toBeCloseTo(330)
    expect(placement.top).toBeCloseTo(220)
  })

  it('falls back to docked placement when exclusions block every side', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'top-header': {
          left: 300,
          top: 200,
          width: 200,
          height: 60,
        } as DOMRectReadOnly,
        outliner: {
          left: 180,
          top: 250,
          width: 100,
          height: 120,
        } as DOMRectReadOnly,
        'camera-tools': {
          left: 450,
          top: 250,
          width: 100,
          height: 120,
        } as DOMRectReadOnly,
        'selected-details': {
          left: 300,
          top: 330,
          width: 200,
          height: 100,
        } as DOMRectReadOnly,
      },
      forceDocked: false,
      points: [
        { x: 360, y: 280 },
        { x: 440, y: 280 },
        { x: 360, y: 340 },
        { x: 440, y: 340 },
      ],
      sourcePointCount: 24,
      projectedPointCount: 4,
      source: 'ui-bounds-node',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.side).toBe('docked')
  })

  it('uses docked placement immediately when forced', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'selected-details': {
          left: 24,
          top: 500,
          width: 240,
          height: 80,
        } as DOMRectReadOnly,
      },
      forceDocked: true,
      points: [{ x: 400, y: 300 }],
      sourcePointCount: 1,
      projectedPointCount: 1,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
  })

  it('uses docked placement for object-origin geometry even when floating space exists', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'selected-details': {
          left: 24,
          top: 500,
          width: 240,
          height: 80,
        } as DOMRectReadOnly,
      },
      forceDocked: false,
      points: [{ x: 400, y: 300 }],
      sourcePointCount: 1,
      projectedPointCount: 1,
      source: 'object-origin',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.side).toBe('docked')
  })

  it('keeps docked placement above an active mobile room drawer', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'selected-details': {
          left: 24,
          top: 500,
          width: 240,
          height: 80,
        } as DOMRectReadOnly,
        'mobile-room-drawer': {
          left: 0,
          top: 300,
          width: 800,
          height: 300,
        } as DOMRectReadOnly,
      },
      forceDocked: true,
      points: [{ x: 400, y: 300 }],
      sourcePointCount: 1,
      projectedPointCount: 1,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
  })

  it('keeps docked placement out of an active desktop room sidebar', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'desktop-room-sidebar': {
          left: 600,
          top: 0,
          width: 200,
          height: 600,
        } as DOMRectReadOnly,
      },
      forceDocked: true,
      points: [{ x: 400, y: 300 }],
      sourcePointCount: 1,
      projectedPointCount: 1,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
  })

  it('respects non-zero container edges for floating placement', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: {
        left: 100,
        top: 50,
        width: 800,
        height: 600,
        right: 900,
        bottom: 650,
      } as DOMRectReadOnly,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 460, y: 330 },
        { x: 540, y: 330 },
        { x: 460, y: 390 },
        { x: 540, y: 390 },
      ],
      sourcePointCount: 8,
      projectedPointCount: 4,
      source: 'render-bounds',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.side).toBe('top')
    expect(placement.candidateId).toBe('top-center')
    expect(placement.left).toBeCloseTo(430)
    expect(placement.top).toBeCloseTo(270)
  })

  it('keeps the previous floating candidate when it remains valid and close in score', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 120, y: 280 },
        { x: 220, y: 280 },
        { x: 120, y: 360 },
        { x: 220, y: 360 },
      ],
      previousFloatingCandidateId: 'top-right',
      projectedPointCount: 4,
      source: 'render-bounds',
      sourcePointCount: 8,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.candidateId).toBe('top-right')
  })

  it('docks when render-bounds projection is too partial to trust', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 360, y: 280 },
        { x: 440, y: 280 },
        { x: 360, y: 340 },
      ],
      projectedPointCount: 3,
      source: 'render-bounds',
      sourcePointCount: 8,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.side).toBe('docked')
  })

  it('chooses a valid nearby candidate instead of docking when top-center is blocked', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'top-header': {
          left: 300,
          top: 200,
          width: 200,
          height: 60,
          right: 500,
          bottom: 260,
        } as DOMRectReadOnly,
      },
      forceDocked: false,
      points: [
        { x: 360, y: 280 },
        { x: 440, y: 280 },
        { x: 360, y: 340 },
        { x: 440, y: 340 },
      ],
      projectedPointCount: 4,
      source: 'render-bounds',
      sourcePointCount: 8,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.candidateId).not.toBe('top-center')
  })

  it('chooses a side candidate beside a diagonal object when top and bottom are blocked', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {
        'top-header': {
          left: 220,
          top: 0,
          width: 360,
          height: 140,
          right: 580,
          bottom: 140,
        } as DOMRectReadOnly,
        'selected-details': {
          left: 250,
          top: 360,
          width: 320,
          height: 180,
          right: 570,
          bottom: 540,
        } as DOMRectReadOnly,
      },
      forceDocked: false,
      points: [
        { x: 300, y: 100 },
        { x: 700, y: 180 },
        { x: 500, y: 500 },
        { x: 100, y: 420 },
      ],
      projectedPointCount: 4,
      source: 'render-bounds',
      sourcePointCount: 4,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(['left', 'right']).toContain(placement.side)
  })

  it('prefers a side candidate for a long diagonal object even when top placement is open', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 529, y: 49 },
        { x: 579, y: 83 },
        { x: 271, y: 551 },
        { x: 221, y: 517 },
      ],
      projectedPointCount: 4,
      source: 'render-bounds',
      sourcePointCount: 4,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(['left', 'right']).toContain(placement.side)
  })

  it('keeps top placement for a chunkier diagonal object when top space is open', () => {
    const placement = computeSelectedToolbarPlacement({
      containerRect: CONTAINER_RECT,
      exclusionRects: {},
      forceDocked: false,
      points: [
        { x: 300, y: 100 },
        { x: 700, y: 180 },
        { x: 500, y: 500 },
        { x: 100, y: 420 },
      ],
      projectedPointCount: 4,
      source: 'render-bounds',
      sourcePointCount: 4,
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.side).toBe('top')
  })
})
