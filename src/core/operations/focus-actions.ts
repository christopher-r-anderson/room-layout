import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import {
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import { subscribeToBlockingOverlay } from '@/core/stores/dialog-store'
import { createReconciler } from '@/core/operations/reconciler'

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
      token: Date.now(),
      targetSelectedId: selectedFurniture.id,
    })
    return
  }

  if (state.history.present.length > 0) {
    selectionActions.requestOutlinerFocus({
      token: Date.now(),
      preferredIndex: 0,
    })
    return
  }

  selectionActions.requestOutlinerFocus({
    token: Date.now(),
    focusContainer: true,
  })
}

/**
 * When a blocking overlay opens, cancel any pending outliner-focus request — the
 * outliner is behind the overlay, so the queued focus must not fire. Idempotent;
 * returns an unsubscribe.
 */
export const startOutlinerFocusReconciler = createReconciler(() => [
  subscribeToBlockingOverlay((isOpen, wasOpen) => {
    if (!isOpen || wasOpen) {
      return
    }

    if (useSelectionStore.getState().outlinerFocusRequest === null) {
      return
    }

    selectionActions.clearOutlinerFocusRequest()
  }),
])
