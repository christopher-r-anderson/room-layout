import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { selectionActions } from '@/core/stores/selection-store'

/**
 * Routes focus into the outliner with intelligent fallback: the selected item if
 * there is one, else the first item, else the outliner container itself. Reads
 * current state at call time, so it works as a plain action without a hook.
 */
export function requestOutlinerFocus() {
  const state = useSceneDocumentStore.getState()
  const selectedFurniture = getSelectedFurniture()

  if (selectedFurniture !== null) {
    selectionActions.requestOutlinerFocus({
      targetSelectedId: selectedFurniture.id,
    })
    return
  }

  if (state.history.present.length > 0) {
    selectionActions.requestOutlinerFocus({
      preferredIndex: 0,
    })
    return
  }

  selectionActions.requestOutlinerFocus({
    focusContainer: true,
  })
}
