import { beforeEach, expect, it } from 'vitest'
import { focusActions, getFocusedSurface, resetFocusStore } from './focus-store'

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

it('resets to no focused surface', () => {
  focusActions.surfaceFocused('scene')

  resetFocusStore()
  expect(getFocusedSurface()).toBeNull()
})
