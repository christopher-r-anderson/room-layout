// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useOverlayLayout } from './overlay-layout-context'
import { OverlayLayoutProvider } from './overlay-layout-provider'
import type { OverlayExclusionRectId } from './use-overlay-exclusion-rects'

describe('OverlayLayoutContext', () => {
  it('exposes the provided layout value', () => {
    const registerCallback = vi.fn<(element: HTMLElement | null) => void>()
    const registerExclusionElement = vi.fn((key: OverlayExclusionRectId) => {
      void key
      return registerCallback
    })
    const exclusionRects = {
      'top-header': new DOMRectReadOnly(1, 2, 3, 4),
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OverlayLayoutProvider
        value={{ exclusionRects, registerExclusionElement }}
      >
        {children}
      </OverlayLayoutProvider>
    )

    const { result } = renderHook(() => useOverlayLayout(), { wrapper })

    expect(result.current).toEqual({
      exclusionRects,
      registerExclusionElement,
    })
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useOverlayLayout())).toThrow(
      'useOverlayLayout must be used within an OverlayLayoutProvider.',
    )
  })
})
