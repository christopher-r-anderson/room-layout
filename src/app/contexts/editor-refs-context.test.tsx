// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { useEditorRefs } from './editor-refs-context'
import { EditorRefsProvider } from './editor-refs-provider'

describe('EditorRefsContext', () => {
  it('exposes the provided refs value', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EditorRefsProvider value={{ roomViewRef, selectedItemControlsRef }}>
        {children}
      </EditorRefsProvider>
    )

    const { result } = renderHook(() => useEditorRefs(), { wrapper })

    expect(result.current).toEqual({ roomViewRef, selectedItemControlsRef })
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useEditorRefs())).toThrow(
      'useEditorRefs must be used within an EditorRefsProvider.',
    )
  })
})
