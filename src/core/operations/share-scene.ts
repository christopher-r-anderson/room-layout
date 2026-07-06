import { msg } from '@lingui/core/macro'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { serializeSceneToUrl } from '@/core/persistence/scene-url'
import { getActiveFinishIds } from '@/core/operations/active-finish-ids'
import { i18n } from '@/shared/i18n/i18n'
import { APP_NAME } from '@/shared/messages/app-identity'
import { LANG_QUERY_PARAM } from '@/shared/i18n/locales'

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
  const items = useSceneDocumentStore.getState().history.present
  const { activeFloorFinishId, activeWallFinishId, activeLightingMoodId } =
    getActiveFinishIds()

  // Strip the transient ?lang= override so shared links never pin a recipient to
  // the sharer's locale (it is a QA/embed override, not a canonical signal).
  const shareBase = new URL(window.location.href)
  shareBase.searchParams.delete(LANG_QUERY_PARAM)

  const url = serializeSceneToUrl(items, shareBase.toString(), {
    floorFinishId: activeFloorFinishId || undefined,
    wallFinishId: activeWallFinishId || undefined,
    lightingMoodId: activeLightingMoodId || undefined,
  })

  if (!url) {
    const tooLarge = i18n._(msg`Scene is too large to share as a URL.`)
    feedbackActions.setStatusMessage(tooLarge)
    feedbackActions.announceAssertive(tooLarge)
    return null
  }

  const shareData = {
    title: APP_NAME,
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
      feedbackActions.announcePolite(i18n._(msg`Room layout shared.`))
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }

      const shareFailed = i18n._(msg`Could not open share options.`)
      feedbackActions.setStatusMessage(shareFailed)
      feedbackActions.announceAssertive(shareFailed)
      return null
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    feedbackActions.clearStatusMessage()
    feedbackActions.announcePolite(i18n._(msg`Scene URL copied to clipboard.`))
    return 'copied'
  } catch {
    const copyFailed = i18n._(msg`Could not copy URL to clipboard.`)
    feedbackActions.setStatusMessage(copyFailed)
    feedbackActions.announceAssertive(copyFailed)
    return null
  }
}
