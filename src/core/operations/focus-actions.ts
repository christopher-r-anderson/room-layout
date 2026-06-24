import {
  sceneDocumentStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-document-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'

/**
 * Routes focus into the outliner with intelligent fallback: the selected item if
 * there is one, else the first item, else the outliner container itself. Reads
 * current state at call time, so it works as a plain action without a hook.
 */
export function requestOutlinerFocus() {
  const state = sceneDocumentStore.getState()
  const selectedFurniture = selectSelectedFurniture(state)

  if (selectedFurniture !== null) {
    selectionFocusActions.requestOutlinerFocus({
      token: Date.now(),
      targetSelectedId: selectedFurniture.id,
    })
    return
  }

  if (state.history.present.length > 0) {
    selectionFocusActions.requestOutlinerFocus({
      token: Date.now(),
      preferredIndex: 0,
    })
    return
  }

  selectionFocusActions.requestOutlinerFocus({
    token: Date.now(),
    focusContainer: true,
  })
}
