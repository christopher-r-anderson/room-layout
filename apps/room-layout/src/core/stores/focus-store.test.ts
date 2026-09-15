import { beforeEach, expect, it } from 'vitest'
import {
  focusActions,
  getFocusedSurface,
  getPendingFocus,
  resetFocusStore,
} from './focus-store'

beforeEach(() => {
  resetFocusStore()
})

it('starts with no focused surface', () => {
  expect(getFocusedSurface()).toBeNull()
})

it('tracks the most recently focused surface', () => {
  focusActions.surfaceFocused('scene')
  expect(getFocusedSurface()).toBe('scene')

  focusActions.surfaceFocused('item-collection')
  expect(getFocusedSurface()).toBe('item-collection')
})

it('clears only when the blurring surface still holds the claim', () => {
  focusActions.surfaceFocused('inspector')

  focusActions.surfaceBlurred('inspector')
  expect(getFocusedSurface()).toBeNull()
})

it('ignores a blur from a surface that no longer holds the claim', () => {
  focusActions.surfaceFocused('item-actions')
  focusActions.surfaceFocused('scene')

  focusActions.surfaceBlurred('item-actions')
  expect(getFocusedSurface()).toBe('scene')
})

it('tracks the pending directive lifecycle with last-write-wins', () => {
  const first = { surface: 'scene' } as const
  const second = { surface: 'inspector' } as const

  focusActions.setPendingFocus(first)
  expect(getPendingFocus()).toBe(first)

  focusActions.setPendingFocus(second)
  expect(getPendingFocus()).toBe(second)

  focusActions.clearPendingFocus()
  expect(getPendingFocus()).toBeNull()
})

it('lets a realization clear only the directive it realized', () => {
  const stale = { surface: 'scene' } as const
  const newer = { surface: 'inspector' } as const

  focusActions.setPendingFocus(stale)
  focusActions.setPendingFocus(newer)

  focusActions.directiveRealized(stale)
  expect(getPendingFocus()).toBe(newer)

  focusActions.directiveRealized(newer)
  expect(getPendingFocus()).toBeNull()
})

it('resets to no focused surface and no pending directive', () => {
  focusActions.surfaceFocused('scene')
  focusActions.setPendingFocus({ surface: 'scene' })

  resetFocusStore()
  expect(getFocusedSurface()).toBeNull()
  expect(getPendingFocus()).toBeNull()
})
