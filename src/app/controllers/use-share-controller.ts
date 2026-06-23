import { useCallback } from 'react'
import { feedbackActions } from '@/core/stores/feedback-store'
import { sceneDocumentActions, useItems } from '@/core/stores/scene-document-store'
import { serializeSceneToUrl } from '@/core/persistence/scene-url'

interface ShareControllerOptions {
  activeFloorFinishId: string
  activeWallFinishId: string
}

export function useShareController({
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
      sceneDocumentActions.setEditorMessage(
        'Scene is too large to share as a URL.',
      )
      feedbackActions.announceAssertive(
        'Scene is too large to share as a URL.',
      )
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
        sceneDocumentActions.clearEditorMessage()
        feedbackActions.announcePolite('Room layout shared.')
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null
        }

        sceneDocumentActions.setEditorMessage('Could not open share options.')
        feedbackActions.announceAssertive('Could not open share options.')
        return null
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      sceneDocumentActions.clearEditorMessage()
      feedbackActions.announcePolite('Scene URL copied to clipboard.')
      return 'copied'
    } catch {
      sceneDocumentActions.setEditorMessage('Could not copy URL to clipboard.')
      feedbackActions.announceAssertive('Could not copy URL to clipboard.')
      return null
    }
  }, [activeFloorFinishId, activeWallFinishId, items])

  return {
    handleShareSceneUrl,
  }
}
