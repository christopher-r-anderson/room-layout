// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusEvent } from 'react'
import {
  resetToolbarInteractionStore,
  selectToolbarEngaged,
  toolbarInteractionActions,
  toolbarInteractionStoreForTests,
} from '@/core/stores/toolbar-interaction-store'
import { useReportToolbarEngagement } from './use-report-toolbar-engagement'

const engaged = () =>
  selectToolbarEngaged(toolbarInteractionStoreForTests.getState())

// Builds a blur event out of real DOM nodes so the handler's relatedTarget
// narrowing and containment check run for real: focus either lands on a control
// inside the wrapper or leaves it entirely.
function blurEvent(focusStaysInside: boolean): FocusEvent<HTMLElement> {
  const wrapper = document.createElement('div')
  const insideControl = document.createElement('button')
  wrapper.appendChild(insideControl)
  const outsideControl = document.createElement('button')

  return {
    currentTarget: wrapper,
    relatedTarget: focusStaysInside ? insideControl : outsideControl,
  } as unknown as FocusEvent<HTMLElement>
}

beforeEach(() => {
  resetToolbarInteractionStore()
})

afterEach(() => {
  resetToolbarInteractionStore()
  vi.restoreAllMocks()
})

describe('useReportToolbarEngagement', () => {
  it('reports pointer and focus engagement to the store', () => {
    const { result } = renderHook(() =>
      useReportToolbarEngagement(true, 'item-1'),
    )

    result.current.onPointerEnter()
    expect(engaged()).toBe(true)

    result.current.onPointerLeave()
    expect(engaged()).toBe(false)

    result.current.onFocus()
    expect(engaged()).toBe(true)
  })

  it('keeps focus engagement when focus moves within the toolbar', () => {
    const { result } = renderHook(() =>
      useReportToolbarEngagement(true, 'item-1'),
    )
    result.current.onFocus()

    result.current.onBlur(blurEvent(true))
    expect(engaged()).toBe(true)

    result.current.onBlur(blurEvent(false))
    expect(engaged()).toBe(false)
  })

  it('resets engagement when the selection changes', () => {
    const { result, rerender } = renderHook(
      ({ selectionKey }) => useReportToolbarEngagement(true, selectionKey),
      { initialProps: { selectionKey: 'item-1' } },
    )
    result.current.onPointerEnter()
    expect(engaged()).toBe(true)

    rerender({ selectionKey: 'item-2' })
    expect(engaged()).toBe(false)
  })

  it('resets engagement when the toolbar stops showing, even mid-grace', () => {
    const { rerender } = renderHook(
      ({ showing }) => useReportToolbarEngagement(showing, 'item-1'),
      { initialProps: { showing: true } },
    )
    toolbarInteractionActions.reportRotation()
    expect(engaged()).toBe(true)

    rerender({ showing: false })
    expect(engaged()).toBe(false)
  })

  it('resets engagement on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useReportToolbarEngagement(true, 'item-1'),
    )
    result.current.onPointerEnter()
    expect(engaged()).toBe(true)

    unmount()
    expect(engaged()).toBe(false)
  })
})
