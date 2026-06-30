// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  resolveHeldPlacement,
  usePinnedPlacement,
} from './use-pinned-placement'
import type { SelectedItemPlacement } from './selected-item-placement.types'

const floatingAt = (left: number, top: number): SelectedItemPlacement => ({
  site: 'floating',
  candidateId: 'top-center',
  left,
  top,
})

const hidden: SelectedItemPlacement = {
  site: 'hidden',
  reason: 'computed-hidden',
}

describe('resolveHeldPlacement', () => {
  it('passes the live placement through when not pinned', () => {
    const held = floatingAt(10, 10)
    const live = floatingAt(40, 60)

    expect(resolveHeldPlacement(held, live, false)).toBe(live)
  })

  it('holds the previous placement while pinned', () => {
    const held = floatingAt(10, 10)
    const live = floatingAt(40, 60)

    expect(resolveHeldPlacement(held, live, true)).toBe(held)
  })

  it('cannot pin onto a non-floating held placement', () => {
    const live = floatingAt(40, 60)

    expect(resolveHeldPlacement(hidden, live, true)).toBe(live)
  })

  it('releases to the live placement when the engine hides the toolbar', () => {
    const held = floatingAt(10, 10)

    expect(resolveHeldPlacement(held, hidden, true)).toBe(hidden)
  })
})

describe('usePinnedPlacement', () => {
  it('tracks the live placement while not pinned', () => {
    const { result, rerender } = renderHook(
      ({ placement }) => usePinnedPlacement(placement, false, 'item-1'),
      { initialProps: { placement: floatingAt(10, 10) } },
    )
    expect(result.current).toEqual(floatingAt(10, 10))

    rerender({ placement: floatingAt(40, 60) })
    expect(result.current).toEqual(floatingAt(40, 60))
  })

  it('freezes the position once pinned and releases to the live spot', () => {
    const { result, rerender } = renderHook(
      ({ placement, pinned }) =>
        usePinnedPlacement(placement, pinned, 'item-1'),
      { initialProps: { placement: floatingAt(10, 10), pinned: false } },
    )

    // Pin engages, capturing the current position.
    rerender({ placement: floatingAt(10, 10), pinned: true })
    expect(result.current).toEqual(floatingAt(10, 10))

    // The object re-projects while pinned: the held position must not move.
    rerender({ placement: floatingAt(40, 60), pinned: true })
    expect(result.current).toEqual(floatingAt(10, 10))

    rerender({ placement: floatingAt(80, 90), pinned: true })
    expect(result.current).toEqual(floatingAt(10, 10))

    // Release: the live placement flows through again (the float site glides).
    rerender({ placement: floatingAt(80, 90), pinned: false })
    expect(result.current).toEqual(floatingAt(80, 90))
  })

  it('captures a fresh position each time the pin re-engages', () => {
    const { result, rerender } = renderHook(
      ({ placement, pinned }) =>
        usePinnedPlacement(placement, pinned, 'item-1'),
      { initialProps: { placement: floatingAt(10, 10), pinned: true } },
    )
    expect(result.current).toEqual(floatingAt(10, 10))

    // Release, let the live position move, then re-pin: it must hold the new spot.
    rerender({ placement: floatingAt(50, 50), pinned: false })
    rerender({ placement: floatingAt(50, 50), pinned: true })
    rerender({ placement: floatingAt(99, 99), pinned: true })
    expect(result.current).toEqual(floatingAt(50, 50))
  })

  it('releases the hold when the reset key changes (new selection)', () => {
    const { result, rerender } = renderHook(
      ({ placement, resetKey }) =>
        usePinnedPlacement(placement, true, resetKey),
      {
        initialProps: { placement: floatingAt(10, 10), resetKey: 'item-1' },
      },
    )
    rerender({ placement: floatingAt(40, 60), resetKey: 'item-1' })
    // Same object, still pinned: held.
    expect(result.current).toEqual(floatingAt(10, 10))

    // New selection: the stale pinned position must not bleed onto it.
    rerender({ placement: floatingAt(40, 60), resetKey: 'item-2' })
    expect(result.current).toEqual(floatingAt(40, 60))
  })
})
