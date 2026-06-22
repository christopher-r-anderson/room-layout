import { dialogActions } from '@/editor-state/dialog-store'
import { editorRuntimeStore } from '@/editor-state/editor-runtime-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'
import { selectionEffects } from '@/editor-state/selection-effects'
import { sceneCommands } from '@/scene/scene-commands'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import { catalogDialogId } from './catalog-dialog-definition'
import { getActiveCatalogId } from './catalog-selection-store'

export function addFurniture(): boolean {
  sceneStateActions.clearEditorMessage()

  const catalogIdToAdd = getActiveCatalogId()
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

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
    sceneStateActions.setEditorMessage(
      result.reason === 'no-space'
        ? ADD_FURNITURE_NO_SPACE_MESSAGE
        : ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
    )
    selectionEffects.notePendingSource(null)
    selectionEffects.notePendingSelection(null)
    return false
  }

  selectionMetaActions.setSelectedSource('toolbar')
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
    sceneStateActions.clearEditorMessage()
  }
}
