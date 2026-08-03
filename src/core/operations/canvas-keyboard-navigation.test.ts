import { describe, expect, it } from 'vitest'
import {
  resolveBrowseTarget,
  sortSpatially,
} from './canvas-keyboard-navigation'

describe('sortSpatially', () => {
  it('returns empty array for empty input', () => {
    expect(sortSpatially([])).toEqual([])
  })

  it('excludes items with null pointerTarget', () => {
    const items = [
      { id: 'a', pointerTarget: null },
      { id: 'b', pointerTarget: { x: 10, y: 20 } },
    ]
    expect(sortSpatially(items)).toEqual(['b'])
  })

  it('sorts top-to-bottom when rows are distinct', () => {
    const items = [
      { id: 'bottom', pointerTarget: { x: 100, y: 200 } },
      { id: 'top', pointerTarget: { x: 100, y: 50 } },
    ]
    expect(sortSpatially(items)).toEqual(['top', 'bottom'])
  })

  it('sorts left-to-right within the same row', () => {
    const items = [
      { id: 'right', pointerTarget: { x: 200, y: 100 } },
      { id: 'left', pointerTarget: { x: 50, y: 100 } },
    ]
    expect(sortSpatially(items)).toEqual(['left', 'right'])
  })

  it('treats items within rowTolerance as the same row', () => {
    // Default rowTolerance = 48; dy = 30 -> same row -> sort by x
    const items = [
      { id: 'right', pointerTarget: { x: 200, y: 110 } },
      { id: 'left', pointerTarget: { x: 50, y: 80 } },
    ]
    expect(sortSpatially(items)).toEqual(['left', 'right'])
  })

  it('treats items beyond rowTolerance as separate rows', () => {
    // dy = 100 > 48 -> different rows -> sort by y
    const items = [
      { id: 'higher-x', pointerTarget: { x: 50, y: 200 } },
      { id: 'lower-x', pointerTarget: { x: 200, y: 100 } },
    ]
    expect(sortSpatially(items)).toEqual(['lower-x', 'higher-x'])
  })

  it('respects custom rowTolerance', () => {
    // dy = 60 > custom tolerance 30 -> different rows
    const items = [
      { id: 'right-below', pointerTarget: { x: 200, y: 160 } },
      { id: 'left-above', pointerTarget: { x: 50, y: 100 } },
    ]
    expect(sortSpatially(items, 30)).toEqual(['left-above', 'right-below'])
  })

  it('handles grid-like layout correctly', () => {
    const items = [
      { id: 'bottom-right', pointerTarget: { x: 200, y: 200 } },
      { id: 'top-right', pointerTarget: { x: 200, y: 50 } },
      { id: 'bottom-left', pointerTarget: { x: 50, y: 200 } },
      { id: 'top-left', pointerTarget: { x: 50, y: 50 } },
    ]
    expect(sortSpatially(items)).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ])
  })

  it('produces deterministic rows when y distances chain within tolerance', () => {
    const items = [
      { id: 'mid-left', pointerTarget: { x: 0, y: 40 } },
      { id: 'bottom-middle', pointerTarget: { x: 50, y: 80 } },
      { id: 'top-right', pointerTarget: { x: 100, y: 0 } },
    ]

    expect(sortSpatially(items)).toEqual([
      'mid-left',
      'top-right',
      'bottom-middle',
    ])
  })
})

describe('resolveBrowseTarget', () => {
  const ordered = ['a', 'b', 'c']

  it('returns null for an empty list', () => {
    expect(resolveBrowseTarget([], null, 'next')).toBeNull()
  })

  it('jumps to the edges for first/last', () => {
    expect(resolveBrowseTarget(ordered, 'b', 'first')).toBe('a')
    expect(resolveBrowseTarget(ordered, 'b', 'last')).toBe('c')
  })

  it('advances and wraps for next', () => {
    expect(resolveBrowseTarget(ordered, 'a', 'next')).toBe('b')
    expect(resolveBrowseTarget(ordered, 'c', 'next')).toBe('a')
  })

  it('retreats and wraps for prev', () => {
    expect(resolveBrowseTarget(ordered, 'b', 'prev')).toBe('a')
    expect(resolveBrowseTarget(ordered, 'a', 'prev')).toBe('c')
  })

  it('starts from the first item for next when there is no current id', () => {
    expect(resolveBrowseTarget(ordered, null, 'next')).toBe('a')
  })

  it('starts from the last item for prev when there is no current id', () => {
    expect(resolveBrowseTarget(ordered, null, 'prev')).toBe('c')
  })
})
