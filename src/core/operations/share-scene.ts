import { sceneDocumentStore } from '@/core/stores/scene-document-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { serializeSceneToUrl } from '@/core/persistence/scene-url'
import { getActiveFinishIds } from '@/core/operations/active-finish-ids'

/**
 * Serializes the current scene to a shareable URL and offers it via the native
 * share sheet, falling back to the clipboard. Reads the scene and active finishes
 * from the stores, so it runs as a plain action — the keyboard `share` command
 * fires it and forgets; the share button awaits the result for its label.
 *
 * Returns `'shared'`/`'copied'` on success, or `null` when the user cancels or
 * the scene is too large; user-facing status/announcements are emitted here.
 */
export async function shareScene(): Promise<'shared' | 'copied' | null> {
  const items = sceneDocumentStore.getState().history.present
  const { activeFloorFinishId, activeWallFinishId, activeLightingMoodId } =
    getActiveFinishIds()

  const url = serializeSceneToUrl(items, window.location.href, {
    floorFinishId: activeFloorFinishId || undefined,
    wallFinishId: activeWallFinishId || undefined,
    lightingMoodId: activeLightingMoodId || undefined,
  })

  if (!url) {
    feedbackActions.setStatusMessage('Scene is too large to share as a URL.')
    feedbackActions.announceAssertive('Scene is too large to share as a URL.')
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
      feedbackActions.clearStatusMessage()
      feedbackActions.announcePolite('Room layout shared.')
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }

      feedbackActions.setStatusMessage('Could not open share options.')
      feedbackActions.announceAssertive('Could not open share options.')
      return null
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    feedbackActions.clearStatusMessage()
    feedbackActions.announcePolite('Scene URL copied to clipboard.')
    return 'copied'
  } catch {
    feedbackActions.setStatusMessage('Could not copy URL to clipboard.')
    feedbackActions.announceAssertive('Could not copy URL to clipboard.')
    return null
  }
}
