// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sceneCommands } from '@/scene/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectById } from '@/core/operations/selection-actions'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { useCanvasKeyboardController } from './use-canvas-keyboard-controller'

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/core/operations/selection-actions', () => ({
  selectById: vi.fn(() => ({ ok: true, status: 'selected' }) as const),
  selectByCanvasPointer: vi.fn(),
  clearSelection: vi.fn(),
}))

vi.mock('@/core/operations/preview-actions', () => ({
  previewFromCanvasKeyboard: vi.fn(),
}))

function createOptions(
  overrides?: Partial<Parameters<typeof useCanvasKeyboardController>[0]>,
) {
  return {
    previewedId: null,
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
    vi.clearAllMocks()
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
    expect(previewFromCanvasKeyboard).toHaveBeenCalledWith('right')
  })

  it('browses spatially sorted scene items and announces the previewed item', () => {
    vi.spyOn(sceneCommands, 'getSnapshot').mockReturnValue(SNAPSHOT as never)
    const options = createOptions()
    const { result } = renderHook(() => useCanvasKeyboardController(options))

    act(() => {
      result.current.handleCanvasBrowse('next')
    })

    expect(previewFromCanvasKeyboard).toHaveBeenLastCalledWith('left')
    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
      'Left Chair',
    )

    act(() => {
      result.current.handleCanvasBrowse('next')
    })

    expect(previewFromCanvasKeyboard).toHaveBeenLastCalledWith('right')
    expect(feedbackActions.announcePolite).toHaveBeenLastCalledWith(
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

    expect(previewFromCanvasKeyboard).not.toHaveBeenCalled()
    expect(feedbackActions.announcePolite).not.toHaveBeenCalled()
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

    expect(selectById).toHaveBeenCalledWith('right', 'canvas-keyboard')
    expect(previewFromCanvasKeyboard).toHaveBeenLastCalledWith(null)
    expect(result.current.previewedIdRef.current).toBeNull()
  })
})
