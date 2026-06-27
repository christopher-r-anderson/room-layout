// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import { serializeSceneToUrl } from '@/core/persistence/scene-url'
import { feedbackActions } from '@/core/stores/feedback-store'
import { CHAIR } from '@/test/support/furniture'
import { shareScene } from './share-scene'

vi.mock('@/core/persistence/scene-url', () => ({
  serializeSceneToUrl: vi.fn(),
}))

vi.mock('@/core/operations/active-finish-ids', () => ({
  getActiveFinishIds: vi.fn(() => ({
    activeFloorFinishId: 'oak-floor',
    activeWallFinishId: 'white-wall',
    selectedFloorOption: null,
    selectedWallOption: null,
  })),
}))

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    setStatusMessage: vi.fn(),
    clearStatusMessage: vi.fn(),
  },
}))

const SHARE_URL = 'https://example.com/shared'

function defineNavigator(prop: 'share' | 'canShare', value: unknown) {
  Object.defineProperty(window.navigator, prop, {
    configurable: true,
    value,
  })
}

describe('shareScene', () => {
  const serializeSceneToUrlMock = vi.mocked(serializeSceneToUrl)
  const clipboardWriteText = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    vi.clearAllMocks()
    resetSceneDocumentStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    serializeSceneToUrlMock.mockReturnValue(SHARE_URL)
    clipboardWriteText.mockResolvedValue(undefined)

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })
    // Default: no native share — exercised explicitly per test where needed.
    defineNavigator('share', undefined)
    defineNavigator('canShare', undefined)
  })

  afterEach(() => {
    defineNavigator('share', undefined)
    defineNavigator('canShare', undefined)
  })

  it('serializes the scene with the active finish ids and copies the URL', async () => {
    const result = await shareScene()

    expect(serializeSceneToUrlMock).toHaveBeenCalledWith(
      [CHAIR],
      window.location.href,
      { floorFinishId: 'oak-floor', wallFinishId: 'white-wall' },
    )
    expect(clipboardWriteText).toHaveBeenCalledWith(SHARE_URL)
    expect(result).toBe('copied')
  })

  it('returns null without copying when the scene is too large to serialize', async () => {
    serializeSceneToUrlMock.mockReturnValue(null)

    const result = await shareScene()

    expect(clipboardWriteText).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('uses the native share sheet when available', async () => {
    const share = vi.fn<(data: unknown) => Promise<void>>().mockResolvedValue()
    defineNavigator('share', share)

    const result = await shareScene()

    expect(share).toHaveBeenCalledWith({ title: 'Room Layout', url: SHARE_URL })
    expect(clipboardWriteText).not.toHaveBeenCalled()
    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Room layout shared.',
    )
    expect(result).toBe('shared')
  })

  it('treats an aborted native share as a silent cancel', async () => {
    const share = vi
      .fn<(data: unknown) => Promise<void>>()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    defineNavigator('share', share)

    const result = await shareScene()

    expect(result).toBeNull()
    expect(clipboardWriteText).not.toHaveBeenCalled()
    // A user cancel is not an error — no assertive message.
    expect(feedbackActions.announceAssertive).not.toHaveBeenCalled()
  })

  it('reports a failed native share without falling back to the clipboard', async () => {
    const share = vi
      .fn<(data: unknown) => Promise<void>>()
      .mockRejectedValue(new Error('share failed'))
    defineNavigator('share', share)

    const result = await shareScene()

    expect(result).toBeNull()
    expect(clipboardWriteText).not.toHaveBeenCalled()
    expect(feedbackActions.setStatusMessage).toHaveBeenCalledWith(
      'Could not open share options.',
    )
    expect(feedbackActions.announceAssertive).toHaveBeenCalledWith(
      'Could not open share options.',
    )
  })

  it('falls back to the clipboard when canShare rejects the payload', async () => {
    const share = vi.fn<(data: unknown) => Promise<void>>().mockResolvedValue()
    defineNavigator('share', share)
    defineNavigator(
      'canShare',
      vi.fn(() => false),
    )

    const result = await shareScene()

    expect(share).not.toHaveBeenCalled()
    expect(clipboardWriteText).toHaveBeenCalledWith(SHARE_URL)
    expect(result).toBe('copied')
  })

  it('falls back to the clipboard when canShare throws', async () => {
    const share = vi.fn<(data: unknown) => Promise<void>>().mockResolvedValue()
    defineNavigator('share', share)
    defineNavigator(
      'canShare',
      vi.fn(() => {
        throw new Error('canShare blew up')
      }),
    )

    const result = await shareScene()

    expect(share).not.toHaveBeenCalled()
    expect(result).toBe('copied')
  })

  it('reports a clipboard failure on the fallback path', async () => {
    clipboardWriteText.mockRejectedValue(new Error('denied'))

    const result = await shareScene()

    expect(result).toBeNull()
    expect(feedbackActions.setStatusMessage).toHaveBeenCalledWith(
      'Could not copy URL to clipboard.',
    )
    expect(feedbackActions.announceAssertive).toHaveBeenCalledWith(
      'Could not copy URL to clipboard.',
    )
  })
})
