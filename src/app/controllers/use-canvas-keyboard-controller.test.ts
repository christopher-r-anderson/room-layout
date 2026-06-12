// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import { useCanvasKeyboardController } from './use-canvas-keyboard-controller'

function createOptions(
  overrides?: Partial<Parameters<typeof useCanvasKeyboardController>[0]>,
) {
  return {
    previewedId: null,
    applyCanvasKeyboardPreviewChange: vi.fn(),
    handleSelectById: vi.fn(() => ({ ok: true, status: 'selected' }) as const),
    announcements: {
      announcePolite: vi.fn(),
    },
    ...overrides,
  }
}

const SNAPSHOT = {
  items: [
    {
      id: 'left',
      name: 'Left Chair',
      pointerTarget: { x: 10, y: 10 },
    },
    {
      id: 'right',
      name: 'Right Chair',
      pointerTarget: { x: 90, y: 10 },
    },
    {
      id: 'hidden',
      name: 'Hidden Chair',
      pointerTarget: null,
    },
  ],
}

describe('useCanvasKeyboardController', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps previewedIdRef synchronized with the previewedId option', () => {
    const options = createOptions({ previewedId: 'left' })
    const { result, rerender } = renderHook(
      ({ previewedId }: { previewedId: string | null }) =>
        useCanvasKeyboardController({ ...options, previewedId }),
      { initialProps: { previewedId: 'left' } },
    )

    expect(result.current.previewedIdRef.current).toBe('left')

    rerender({ previewedId: 'right' })

    expect(result.current.previewedIdRef.current).toBe('right')
  })

  it('writes previewedIdRef synchronously when applying a keyboard preview change', () => {
    const options = createOptions()
    const { result } = renderHook(() => useCanvasKeyboardController(options))

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange('right')
    })

    expect(result.current.previewedIdRef.current).toBe('right')
    expect(options.applyCanvasKeyboardPreviewChange).toHaveBeenCalledWith(
      'right',
    )
  })

  it('browses spatially sorted scene items and announces the previewed item', () => {
    vi.spyOn(sceneCommands, 'getSnapshot').mockReturnValue(SNAPSHOT as never)
    const options = createOptions()
    const { result } = renderHook(() => useCanvasKeyboardController(options))

    act(() => {
      result.current.handleCanvasBrowse('next')
    })

    expect(options.applyCanvasKeyboardPreviewChange).toHaveBeenLastCalledWith(
      'left',
    )
    expect(options.announcements.announcePolite).toHaveBeenLastCalledWith(
      'Left Chair',
    )

    act(() => {
      result.current.handleCanvasBrowse('next')
    })

    expect(options.applyCanvasKeyboardPreviewChange).toHaveBeenLastCalledWith(
      'right',
    )
    expect(options.announcements.announcePolite).toHaveBeenLastCalledWith(
      'Right Chair',
    )
  })

  it('does nothing when no visible scene items are available', () => {
    vi.spyOn(sceneCommands, 'getSnapshot').mockReturnValue({
      items: [{ id: 'hidden', name: 'Hidden Chair', pointerTarget: null }],
    } as never)
    const options = createOptions()
    const { result } = renderHook(() => useCanvasKeyboardController(options))

    act(() => {
      result.current.handleCanvasBrowse('next')
    })

    expect(options.applyCanvasKeyboardPreviewChange).not.toHaveBeenCalled()
    expect(options.announcements.announcePolite).not.toHaveBeenCalled()
  })

  it('selects the synchronously tracked preview and clears it', () => {
    const options = createOptions()
    const { result } = renderHook(() => useCanvasKeyboardController(options))

    act(() => {
      result.current.handleCanvasKeyboardPreviewChange('right')
    })
    act(() => {
      result.current.handleCanvasSelectPreviewed()
    })

    expect(options.handleSelectById).toHaveBeenCalledWith(
      'right',
      'canvas-keyboard',
    )
    expect(options.applyCanvasKeyboardPreviewChange).toHaveBeenLastCalledWith(
      null,
    )
    expect(result.current.previewedIdRef.current).toBeNull()
  })
})
