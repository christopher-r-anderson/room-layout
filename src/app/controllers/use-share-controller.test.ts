// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import { serializeSceneToUrl } from '@/features/url-scene/scene-url'
import { useShareController } from './use-share-controller'

vi.mock('@/features/url-scene/scene-url', () => ({
  serializeSceneToUrl: vi.fn(),
}))

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
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

describe('useShareController', () => {
  const serializeSceneToUrlMock = vi.mocked(serializeSceneToUrl)
  const clipboardWriteText = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    resetSceneStateStore()
    serializeSceneToUrlMock.mockReset()
    clipboardWriteText.mockReset()
    clipboardWriteText.mockResolvedValue(undefined)

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })
  })

  it('serializes the share URL with the active finish ids supplied by the app shell', async () => {
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    serializeSceneToUrlMock.mockReturnValue('https://example.com/shared')

    const { result } = renderHook(() =>
      useShareController({
        activeFloorFinishId: 'oak-floor',
        activeWallFinishId: 'white-wall',
      }),
    )

    await act(async () => {
      await result.current.handleShareSceneUrl()
    })

    expect(serializeSceneToUrlMock).toHaveBeenCalledWith(
      [CHAIR],
      window.location.href,
      {
        floorFinishId: 'oak-floor',
        wallFinishId: 'white-wall',
      },
    )
    expect(clipboardWriteText).toHaveBeenCalledWith(
      'https://example.com/shared',
    )
  })
})
