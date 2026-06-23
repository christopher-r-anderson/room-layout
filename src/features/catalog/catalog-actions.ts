import { dialogActions } from '@/core/stores/dialog-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { selectionEffects } from '@/core/operations/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { catalogDialogId } from './catalog-dialog-definition'
import { getActiveCatalogId } from './catalog-selection-store'

export function addFurniture(): boolean {
  sceneDocumentActions.clearEditorMessage()

  const catalogIdToAdd = getActiveCatalogId()
  const editorInteractionsEnabled =
    isEditorInteractive()

  if (
    !catalogIdToAdd ||
    !editorInteractionsEnabled ||
    !sceneCommands.isSceneReady()
  ) {
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  const result = sceneCommands.addFurniture(catalogIdToAdd)

  if (!result.ok) {
    sceneDocumentActions.setEditorMessage(
      result.reason === 'no-space'
        ? ADD_FURNITURE_NO_SPACE_MESSAGE
        : ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
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
  const changed = dialogActions.setDialogOpen(catalogDialogId, open)

  if (open && changed) {
    sceneDocumentActions.clearEditorMessage()
  }
}
