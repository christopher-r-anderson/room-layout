import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { assetsStore } from '@/core/stores/assets-store'
import { sceneCommands } from '@/scene/scene-commands'
import { i18n } from '@/shared/i18n/i18n'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { CATALOG_DIALOG_ID } from './catalog-dialog-definition'
import { getActiveCatalogId } from './catalog-selection-store'

function resolveCollectionSourcePath(catalogId: string): string | null {
  const { catalog, collections } = assetsStore.getState()
  const entry = catalog.find((candidate) => candidate.id === catalogId)
  if (!entry) {
    return null
  }
  const collection = collections.find(
    (candidate) => candidate.id === entry.collectionId,
  )
  return collection?.sourcePath ?? null
}

// Under environment-first loading a catalog item's model may not be loaded when
// the user adds it, so this ensures the collection is loaded before dispatching
// the add. It is idempotent and resolves immediately for already-loaded
// collections; the model is already downloading in the background for the rest.
export async function addFurniture(): Promise<boolean> {
  feedbackActions.clearStatusMessage()

  const catalogIdToAdd = getActiveCatalogId()

  if (!catalogIdToAdd || !sceneCommands.isSceneReady()) {
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  const sourcePath = resolveCollectionSourcePath(catalogIdToAdd)
  if (sourcePath) {
    await sceneCommands.ensureCollectionLoaded(sourcePath)
  }

  // The scene may have been torn down while the model loaded (retry/teardown).
  if (!sceneCommands.isSceneReady()) {
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  const result = sceneCommands.addFurniture(catalogIdToAdd)

  if (!result.ok) {
    feedbackActions.setStatusMessage(
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
