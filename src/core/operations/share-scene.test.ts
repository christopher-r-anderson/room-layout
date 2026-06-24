// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import { serializeSceneToUrl } from '@/core/persistence/scene-url'
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

const CHAIR = {
  id: 'chair-1',
  catalogId: 'chair-1',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair' as const,
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

describe('shareScene', () => {
  const serializeSceneToUrlMock = vi.mocked(serializeSceneToUrl)
  const clipboardWriteText = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    resetSceneDocumentStore()
    serializeSceneToUrlMock.mockReset()
    clipboardWriteText.mockReset()
    clipboardWriteText.mockResolvedValue(undefined)

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    })
  })

  it('serializes the scene with the active finish ids and copies the URL', async () => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    serializeSceneToUrlMock.mockReturnValue('https://example.com/shared')

    const result = await shareScene()

    expect(serializeSceneToUrlMock).toHaveBeenCalledWith(
      [CHAIR],
      window.location.href,
      { floorFinishId: 'oak-floor', wallFinishId: 'white-wall' },
    )
    expect(clipboardWriteText).toHaveBeenCalledWith(
      'https://example.com/shared',
    )
    expect(result).toBe('copied')
  })

  it('returns null without copying when the scene is too large to serialize', async () => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    serializeSceneToUrlMock.mockReturnValue(null)

    const result = await shareScene()

    expect(clipboardWriteText).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
