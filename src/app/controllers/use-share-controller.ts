import { useCallback } from 'react'
import { sceneStateActions, useItems } from '@/editor-state/scene-state-store'
import { serializeSceneToUrl } from '@/features/url-scene/scene-url'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
}

interface ShareControllerOptions {
  announcements: AnnouncementsApi
  activeFloorFinishId: string
  activeWallFinishId: string
}

export function useShareController({
  announcements,
  activeFloorFinishId,
  activeWallFinishId,
}: ShareControllerOptions) {
  const items = useItems()

  const handleShareSceneUrl = useCallback(async () => {
    const url = serializeSceneToUrl(items, window.location.href, {
      floorFinishId: activeFloorFinishId || undefined,
      wallFinishId: activeWallFinishId || undefined,
    })

    if (!url) {
      sceneStateActions.setEditorMessage(
        'Scene is too large to share as a URL.',
      )
      announcements.announceAssertive('Scene is too large to share as a URL.')
      return null
    }

    const shareData = {
      title: 'Room Layout',
      url,
    }

    let canUseNativeShare = typeof navigator.share === 'function'

    if (canUseNativeShare && typeof navigator.canShare === 'function') {
      try {
        canUseNativeShare = navigator.canShare({ url: shareData.url })
      } catch {
        canUseNativeShare = false
      }
    }

    if (canUseNativeShare) {
      try {
        await navigator.share(shareData)
        sceneStateActions.clearEditorMessage()
        announcements.announcePolite('Room layout shared.')
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null
        }

        sceneStateActions.setEditorMessage('Could not open share options.')
        announcements.announceAssertive('Could not open share options.')
        return null
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      sceneStateActions.clearEditorMessage()
      announcements.announcePolite('Scene URL copied to clipboard.')
      return 'copied'
    } catch {
      sceneStateActions.setEditorMessage('Could not copy URL to clipboard.')
      announcements.announceAssertive('Could not copy URL to clipboard.')
      return null
    }
  }, [activeFloorFinishId, activeWallFinishId, announcements, items])

  return {
    handleShareSceneUrl,
  }
}
