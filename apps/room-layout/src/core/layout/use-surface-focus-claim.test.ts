// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { getFocusedSurface, resetFocusStore } from '@/core/stores/focus-store'
import { useSurfaceFocusClaim } from './use-surface-focus-claim'

beforeEach(() => {
  resetFocusStore()
})

it('returns a referentially stable value across re-renders', () => {
  const { result, rerender } = renderHook(() => useSurfaceFocusClaim('scene'))
  const first = result.current

  rerender()

  expect(result.current).toBe(first)
})

it('claims on focus, releases on leaving blur, and releases via the ref', () => {
  const { result } = renderHook(() => useSurfaceFocusClaim('scene'))
  const element = document.createElement('section')
  document.body.appendChild(element)

  result.current.onFocus()
  expect(getFocusedSurface()).toBe('scene')

  result.current.onBlur({
    currentTarget: element,
    relatedTarget: null,
  } as never)
  expect(getFocusedSurface()).toBeNull()

  result.current.onFocus()
  result.current.claimRef(null)
  expect(getFocusedSurface()).toBeNull()

  element.remove()
})
