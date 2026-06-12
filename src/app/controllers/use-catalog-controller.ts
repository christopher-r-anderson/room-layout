import { useCallback } from 'react'
import type { DialogStateSnapshot } from '@/editor-state/dialog-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
} from '@/shared/messages/command-messages'
import type { SelectionEffectsApi } from './use-selection-effects-controller'

interface CatalogControllerOptions {
  dialogState: Pick<DialogStateSnapshot, 'setCatalogOpen'>
  selectionEffects: SelectionEffectsApi
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
}

export function useCatalogController({
  dialogState,
  selectionEffects,
  catalogIdToAdd,
  editorInteractionsEnabled,
}: CatalogControllerOptions) {
  const handleAddFurniture = useCallback(() => {
    sceneStateActions.clearEditorMessage()

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
  }, [catalogIdToAdd, editorInteractionsEnabled, selectionEffects])

  const handleCatalogDrawerOpenChange = useCallback(
    (open: boolean) => {
      const changed = dialogState.setCatalogOpen(open)

      if (open && changed) {
        sceneStateActions.clearEditorMessage()
      }
    },
    [dialogState],
  )

  return {
    handleAddFurniture,
    handleCatalogDrawerOpenChange,
  }
}
