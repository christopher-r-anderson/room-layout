import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { getSourcePathForCatalogId } from '@/core/stores/assets-store'
import { sceneCommands } from '@/core/scene-commands'
import { addFurniture as addFurnitureToDocument } from '@/core/operations/furniture-mutations'
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
      // transient one (connection/stall) invites a re-add.
      const failureKind = getCollectionFailureKind(sourcePath)
      reportAddFailure(
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

  const result = addFurnitureToDocument(catalogIdToAdd)

  if (!result.ok) {
    reportAddFailure(
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

// Add failures surface on two channels while the drawer is open: a toast for
// visual users (the status region sits under the drawer overlay), and an
// assertive announcement - the toast region is a polite live region only, and
// an error in response to a user action should interrupt. Both survive the
// drawer's aria-hiding, which exempts aria-live regions.
function reportAddFailure(message: string) {
  toast.error(message)
  feedbackActions.announceAssertive(message)
}

export function setCatalogDrawerOpen(open: boolean) {
  const changed = dialogActions.setDialogOpen(CATALOG_DIALOG_ID, open)

  if (open && changed) {
    feedbackActions.clearStatusMessage()
  }
}
