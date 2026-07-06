import {
  sceneDocumentStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-document-store'
import {
  selectionFocusActions,
  useSelectionFocusStore,
} from '@/core/stores/selection-focus-store'
import { subscribeToBlockingOverlay } from '@/core/stores/dialog-store'

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

let activeOutlinerFocusUnsubscribe: (() => void) | null = null

/**
 * When a blocking overlay opens, cancel any pending outliner-focus request — the
 * outliner is behind the overlay, so the queued focus must not fire. Idempotent;
 * returns an unsubscribe.
 */
export function startOutlinerFocusReconciler(): () => void {
  if (activeOutlinerFocusUnsubscribe) {
    return activeOutlinerFocusUnsubscribe
  }

  const unsubscribe = subscribeToBlockingOverlay((isOpen, wasOpen) => {
    if (!isOpen || wasOpen) {
      return
    }

    if (useSelectionFocusStore.getState().outlinerFocusRequest === null) {
      return
    }

    selectionFocusActions.clearOutlinerFocusRequest()
  })

  activeOutlinerFocusUnsubscribe = () => {
    unsubscribe()
    activeOutlinerFocusUnsubscribe = null
  }

  return activeOutlinerFocusUnsubscribe
}
