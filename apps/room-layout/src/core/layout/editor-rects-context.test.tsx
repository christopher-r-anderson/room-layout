// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEditorRects, useEditorRectRegistry } from './editor-rects-context'
import { EditorRectsProvider } from './editor-rects-provider'
import type { EditorRectId } from './editor-rects-context'
import type { ReactNode } from 'react'

describe('EditorRectsContext', () => {
  it('exposes the registry and rects through their own hooks', () => {
    const registerCallback = vi.fn<(element: HTMLElement | null) => void>()
    const registerRect = vi.fn((key: EditorRectId) => {
      void key
      return registerCallback
    })
    const providedRects = {
      'top-header': new DOMRectReadOnly(1, 2, 3, 4),
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditorRectsProvider registerRect={registerRect} rects={providedRects}>
        {children}
      </EditorRectsProvider>
    )

    const { result: registry } = renderHook(() => useEditorRectRegistry(), {
      wrapper,
    })
    const { result: rects } = renderHook(() => useEditorRects(), { wrapper })

    expect(registry.current).toBe(registerRect)
    expect(rects.current).toEqual(providedRects)
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
