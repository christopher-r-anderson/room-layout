// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  useExclusionRects,
  useExclusionRegistry,
} from './overlay-exclusion-context'
import { OverlayExclusionProvider } from './overlay-exclusion-provider'
import type { OverlayExclusionRectId } from './use-overlay-exclusion-rects'

describe('OverlayExclusionContext', () => {
  it('exposes the registry and rects through their own hooks', () => {
    const registerCallback = vi.fn<(element: HTMLElement | null) => void>()
    const registerExclusionElement = vi.fn((key: OverlayExclusionRectId) => {
      void key
      return registerCallback
    })
    const exclusionRects = {
      'top-header': new DOMRectReadOnly(1, 2, 3, 4),
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OverlayExclusionProvider
        registerExclusionElement={registerExclusionElement}
        exclusionRects={exclusionRects}
      >
        {children}
      </OverlayExclusionProvider>
    )

    const { result: registry } = renderHook(() => useExclusionRegistry(), {
      wrapper,
    })
    const { result: rects } = renderHook(() => useExclusionRects(), { wrapper })

    expect(registry.current).toBe(registerExclusionElement)
    expect(rects.current).toEqual(exclusionRects)
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useExclusionRegistry())).toThrow(
      'useExclusionRegistry must be used within an OverlayExclusionProvider.',
    )
    expect(() => renderHook(() => useExclusionRects())).toThrow(
      'useExclusionRects must be used within an OverlayExclusionProvider.',
    )
  })
})
