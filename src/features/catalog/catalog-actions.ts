import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { getSourcePathForCatalogId } from '@/core/stores/assets-store'
import { sceneCommands } from '@/scene/scene-commands'
import { ensureCollectionLoaded } from '@/core/operations/collection-loader'
import { getCollectionFailureKind } from '@/core/stores/collection-loading-store'
import { toast } from 'sonner'
import { i18n } from '@/shared/i18n/i18n'
import {
  ADD_FURNITURE_LOAD_FAILED_MESSAGE,
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNAVAILABLE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { CATALOG_DIALOG_ID } from './catalog-dialog-definition'
import { getActiveCatalogId } from './catalog-selection-store'

// Prefetch-on-intent: start loading a catalog item's model when it is selected,
// so a subsequent Add is usually instant. Fire-and-forget - the actual Add
// surfaces any load failure - and idempotent with the Add's own ensure call.
export function prefetchCatalogItem(catalogId: string): void {
  const sourcePath = getSourcePathForCatalogId(catalogId)
  if (!sourcePath) {
    return
  }
  void ensureCollectionLoaded(sourcePath).catch(() => {
    // Swallowed here; a real add of this item reports the failure to the user.
  })
}

// Under environment-first loading a catalog item's model may not be loaded when
// the user adds it, so this ensures the collection is loaded before dispatching
// the add. It is idempotent and resolves immediately for already-loaded
// collections; the model is already downloading in the background for the rest.
export async function addFurniture(): Promise<boolean> {
  const catalogIdToAdd = getActiveCatalogId()

  if (!catalogIdToAdd || !sceneCommands.isSceneReady()) {
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  const sourcePath = getSourcePathForCatalogId(catalogIdToAdd)
  if (sourcePath) {
    try {
      await ensureCollectionLoaded(sourcePath)
    } catch {
      // The model failed to load. Message by cause: a permanent failure (missing
      // asset) says it is unavailable and will not invite a futile retry; a
      // transient one (connection/stall) invites a re-add. A toast (not the status
      // region) so it is visible over the open drawer, which aria-hides the chrome.
      const failureKind = getCollectionFailureKind(sourcePath)
      toast.error(
        i18n._(
          failureKind === 'unavailable'
            ? ADD_FURNITURE_UNAVAILABLE_MESSAGE
            : ADD_FURNITURE_LOAD_FAILED_MESSAGE,
        ),
      )
      selectionEffects.notePendingSource(null)
      selectionEffects.notePendingSelection(null)
      return false
    }
  }

  // The scene may have been torn down while the model loaded (retry/teardown).
  if (!sceneCommands.isSceneReady()) {
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  const result = sceneCommands.addFurniture(catalogIdToAdd)

  if (!result.ok) {
    // A toast (like the load failures) so it is visible over the open drawer;
    // the status region is aria-hidden behind it.
    toast.error(
      i18n._(
        result.reason === 'no-space'
          ? ADD_FURNITURE_NO_SPACE_MESSAGE
          : ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
      ),
    )
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  selectionFocusActions.setSelectedSource('toolbar')
  selectionEffects.notePendingSource('toolbar')
  selectionEffects.notePendingSelection({
    announceMode: 'added',
    requestOutlinerFocus: false,
  })
  return true
}

export function setCatalogDrawerOpen(open: boolean) {
  const changed = dialogActions.setDialogOpen(CATALOG_DIALOG_ID, open)

  if (open && changed) {
    feedbackActions.clearStatusMessage()
  }
}
