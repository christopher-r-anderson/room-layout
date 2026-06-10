// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HEADER_DESKTOP_MEDIA_QUERY,
  useHeaderLayoutMode,
} from '@/app/shell/use-header-layout-mode'

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  let currentMatches = matches

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      media: query,
      get matches() {
        return currentMatches
      },
      onchange: null,
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.add(listener)
      },
      removeEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
    })),
  })

  return {
    setMatches(nextMatches: boolean) {
      currentMatches = nextMatches
      const event = {
        matches: currentMatches,
        media: HEADER_DESKTOP_MEDIA_QUERY,
      } as MediaQueryListEvent

      listeners.forEach((listener) => {
        listener(event)
      })
    },
  }
}

describe('useHeaderLayoutMode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to mobile when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    })

    const { result } = renderHook(() => useHeaderLayoutMode())

    expect(result.current).toBe('mobile')
  })

  it('tracks the 48rem desktop breakpoint via matchMedia', () => {
    const matchMedia = installMatchMedia(false)

    const { result } = renderHook(() => useHeaderLayoutMode())

    expect(window.matchMedia).toHaveBeenCalledWith(HEADER_DESKTOP_MEDIA_QUERY)
    expect(result.current).toBe('mobile')

    act(() => {
      matchMedia.setMatches(true)
    })

    expect(result.current).toBe('desktop')

    act(() => {
      matchMedia.setMatches(false)
    })

    expect(result.current).toBe('mobile')
  })
})
