// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePreviewController } from './use-preview-controller'

function defaultOptions(
  overrides: Partial<Parameters<typeof usePreviewController>[0]> = {},
) {
  return {
    isModalOpen: false,
    editorInteractionsEnabled: true,
    itemIds: ['item-1', 'item-2'],
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('usePreviewController', () => {
  it('does not restore scene preview automatically after drag gate lifts', () => {
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleScenePreviewChange('item-1')
    })
    expect(result.current.previewedId).toBe('item-1')

    act(() => {
      result.current.handleDragStateChange(true)
    })
    expect(result.current.previewedId).toBeNull()

    act(() => {
      result.current.handleDragStateChange(false)
    })
    expect(result.current.previewedId).toBeNull()
  })

  it('keeps outliner preview active when scene emits delayed clear', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleOutlinerPreviewChange('item-1', 'outliner-hover')
    })
    expect(result.current.previewedId).toBe('item-1')

    act(() => {
      result.current.handleScenePreviewChange(null)
      vi.advanceTimersByTime(60)
    })

    expect(result.current.previewedId).toBe('item-1')
  })

  it('clears scene preview after delayed leave window', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleScenePreviewChange('item-1')
    })
    expect(result.current.previewedId).toBe('item-1')

    act(() => {
      result.current.handleScenePreviewChange(null)
      vi.advanceTimersByTime(60)
    })

    expect(result.current.previewedId).toBeNull()
  })

  it('keeps focus preview active when hover preview ends, then clears on blur', () => {
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleOutlinerPreviewChange('item-1', 'outliner-hover')
    })
    expect(result.current.previewedId).toBe('item-1')

    act(() => {
      result.current.handleOutlinerPreviewChange('item-2', 'outliner-focus')
    })
    expect(result.current.previewedId).toBe('item-2')

    act(() => {
      result.current.handleOutlinerPreviewChange(null, 'outliner-hover')
    })
    expect(result.current.previewedId).toBe('item-2')

    act(() => {
      result.current.handleOutlinerPreviewChange(null, 'outliner-focus')
    })
    expect(result.current.previewedId).toBeNull()
  })

  it('uses canvas-keyboard preview as an explicit preview source and clears it', () => {
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange('item-2')
    })
    expect(result.current.previewedId).toBe('item-2')

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange(null)
    })
    expect(result.current.previewedId).toBeNull()
  })

  it('does not clear a newer outliner preview when canvas-keyboard preview exits', () => {
    const { result } = renderHook(() => usePreviewController(defaultOptions()))

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange('item-1')
    })
    expect(result.current.previewedId).toBe('item-1')

    act(() => {
      result.current.handleOutlinerPreviewChange('item-2', 'outliner-focus')
    })
    expect(result.current.previewedId).toBe('item-2')

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange(null)
    })
    expect(result.current.previewedId).toBe('item-2')
  })
})
