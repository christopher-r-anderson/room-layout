import {
  useSceneDocumentStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-document-store'
import {
  selectionFocusActions,
  useSelectionFocusStore,
} from '@/core/stores/selection-focus-store'
import { subscribeToBlockingOverlay } from '@/core/stores/dialog-store'
import { createReconciler } from '@/core/operations/reconciler'

/**
 * Routes focus into the outliner with intelligent fallback: the selected item if
 * there is one, else the first item, else the outliner container itself. Reads
 * current state at call time, so it works as a plain action without a hook.
 */
export function requestOutlinerFocus() {
  const state = useSceneDocumentStore.getState()
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

    if (useSelectionFocusStore.getState().outlinerFocusRequest === null) {
      return
    }

    selectionFocusActions.clearOutlinerFocusRequest()
  }),
])
