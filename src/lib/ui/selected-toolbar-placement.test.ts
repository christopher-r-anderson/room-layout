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
      source: 'render-bounds',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('floating')
    expect(placement.side).toBe('top')
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
      source: 'ui-bounds-node',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.side).toBe('docked')
    expect(placement.left).toBe(300)
    expect(placement.top).toBe(442)
    expect(placement.source).toBe('ui-bounds-node')
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
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.left).toBe(24)
    expect(placement.top).toBe(440)
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
      source: 'object-origin',
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.side).toBe('docked')
    expect(placement.source).toBe('object-origin')
    expect(placement.left).toBe(24)
    expect(placement.top).toBe(440)
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
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.left).toBe(24)
    expect(placement.top).toBe(240)
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
      toolbarSize: { width: 140, height: 48 },
    })

    expect(placement.mode).toBe('docked')
    expect(placement.left).toBe(448)
    expect(placement.top).toBe(540)
  })
})
