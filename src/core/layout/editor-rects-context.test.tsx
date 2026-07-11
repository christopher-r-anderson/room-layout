// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEditorRects, useEditorRectRegistry } from './editor-rects-context'
import { EditorRectsProvider } from './editor-rects-provider'
import type { EditorRectId } from './editor-rects-context'

describe('OverlayExclusionContext', () => {
  it('exposes the registry and rects through their own hooks', () => {
    const registerCallback = vi.fn<(element: HTMLElement | null) => void>()
    const registerExclusionElement = vi.fn((key: EditorRectId) => {
      void key
      return registerCallback
    })
    const exclusionRects = {
      'top-header': new DOMRectReadOnly(1, 2, 3, 4),
    }
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EditorRectsProvider
        registerRect={registerExclusionElement}
        rects={exclusionRects}
      >
        {children}
      </EditorRectsProvider>
    )

    const { result: registry } = renderHook(() => useEditorRectRegistry(), {
      wrapper,
    })
    const { result: rects } = renderHook(() => useEditorRects(), { wrapper })

    expect(registry.current).toBe(registerExclusionElement)
    expect(rects.current).toEqual(exclusionRects)
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useEditorRectRegistry())).toThrow(
      'useEditorRectRegistry must be used within an EditorRectsProvider.',
    )
    expect(() => renderHook(() => useEditorRects())).toThrow(
      'useEditorRects must be used within an EditorRectsProvider.',
    )
  })
})
