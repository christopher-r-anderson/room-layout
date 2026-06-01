// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OverlayExclusionRectId } from '@/app/overlay/use-overlay-exclusion-rects'
import {
  OverlayLayoutProvider,
  useOverlayLayout,
} from './overlay-layout-context'

describe('OverlayLayoutContext', () => {
  it('exposes the provided layout value', () => {
    const registerCallback = vi.fn<(element: HTMLElement | null) => void>()
    const registerExclusionElement = vi.fn((key: OverlayExclusionRectId) => {
      void key
      return registerCallback
    })
    const syncLayoutMode = vi.fn()
    const exclusionRects = [new DOMRectReadOnly(1, 2, 3, 4)]
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OverlayLayoutProvider
        value={{ exclusionRects, registerExclusionElement, syncLayoutMode }}
      >
        {children}
      </OverlayLayoutProvider>
    )

    const { result } = renderHook(() => useOverlayLayout(), { wrapper })

    expect(result.current).toEqual({
      exclusionRects,
      registerExclusionElement,
      syncLayoutMode,
    })
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useOverlayLayout())).toThrow(
      'useOverlayLayout must be used within an OverlayLayoutProvider.',
    )
  })
})
