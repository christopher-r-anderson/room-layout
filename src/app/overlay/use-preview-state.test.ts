// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePreviewState } from './use-preview-state'

function defaultOptions(
  overrides: Partial<Parameters<typeof usePreviewState>[0]> = {},
) {
  return {
    isDragging: false,
    isModalOpen: false,
    editorInteractionsEnabled: true,
    itemIds: ['item-1', 'item-2'],
    ...overrides,
  }
}

describe('usePreviewState', () => {
  describe('call ordering', () => {
    it('second setPreview call overwrites first (last call wins)', () => {
      const { result } = renderHook(() => usePreviewState(defaultOptions()))

      act(() => {
        result.current.setPreview('item-1')
      })
      act(() => {
        result.current.setPreview('item-2')
      })

      expect(result.current.previewedId).toBe('item-2')
    })

    it('clearPreview sets previewedId to null', () => {
      const { result } = renderHook(() => usePreviewState(defaultOptions()))

      act(() => {
        result.current.setPreview('item-1')
      })
      act(() => {
        result.current.clearPreview()
      })

      expect(result.current.previewedId).toBeNull()
    })
  })

  describe('reactive clearing', () => {
    it('clears when isDragging becomes true', () => {
      const { result, rerender } = renderHook((opts) => usePreviewState(opts), {
        initialProps: defaultOptions(),
      })

      act(() => {
        result.current.setPreview('item-1')
      })
      expect(result.current.previewedId).toBe('item-1')

      rerender(defaultOptions({ isDragging: true }))

      expect(result.current.previewedId).toBeNull()
    })

    it('clears when isModalOpen becomes true', () => {
      const { result, rerender } = renderHook((opts) => usePreviewState(opts), {
        initialProps: defaultOptions(),
      })

      act(() => {
        result.current.setPreview('item-1')
      })

      rerender(defaultOptions({ isModalOpen: true }))

      expect(result.current.previewedId).toBeNull()
    })

    it('clears when editorInteractionsEnabled becomes false', () => {
      const { result, rerender } = renderHook((opts) => usePreviewState(opts), {
        initialProps: defaultOptions(),
      })

      act(() => {
        result.current.setPreview('item-1')
      })

      rerender(defaultOptions({ editorInteractionsEnabled: false }))

      expect(result.current.previewedId).toBeNull()
    })
  })

  describe('id reconciliation', () => {
    it('clears previewedId when the item is removed from itemIds', () => {
      const { result, rerender } = renderHook((opts) => usePreviewState(opts), {
        initialProps: defaultOptions({ itemIds: ['item-1', 'item-2'] }),
      })

      act(() => {
        result.current.setPreview('item-1')
      })
      expect(result.current.previewedId).toBe('item-1')

      rerender(defaultOptions({ itemIds: ['item-2'] }))

      expect(result.current.previewedId).toBeNull()
    })

    it('does not clear when previewedId is still in itemIds', () => {
      const { result, rerender } = renderHook((opts) => usePreviewState(opts), {
        initialProps: defaultOptions({ itemIds: ['item-1', 'item-2'] }),
      })

      act(() => {
        result.current.setPreview('item-1')
      })

      rerender(defaultOptions({ itemIds: ['item-1'] }))

      expect(result.current.previewedId).toBe('item-1')
    })
  })
})
