import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'
import {
  isBlockingOverlayOpen,
  subscribeToBlockingOverlay,
} from '@/core/stores/dialog-store'
import {
  useEditorLifecycleStore,
  isEditorInteractive,
} from '@/core/stores/editor-lifecycle-store'
import {
  cancelScenePreviewClear,
  forceClearPreview,
} from '@/core/operations/preview-actions'
import { createReconciler } from '@/core/operations/reconciler'

/**
 * Clears preview state when it must not persist — dragging, a blocking overlay
 * open, or interactions disabled. The visible preview is already suppressed by
 * `usePreviewedId`'s read gating; this clears the raw id and active source so
 * nothing stale flashes back when the gate lifts.
 */
function reconcilePreview() {
  const isDragging = useSceneSessionStore.getState().isDragging

  if (!isDragging && !isBlockingOverlayOpen() && isEditorInteractive()) {
    return
  }

  forceClearPreview()
}

// A previewed item that leaves the item list (delete, undo of an add) must not
// keep a dangling preview pointer; clearing the raw id keeps it from reapplying
// if a redo brings the same id back.
function reconcileDanglingPreview() {
  const previewedId = useSceneSessionStore.getState().previewedIdRaw

  if (previewedId === null) {
    return
  }

  const items = useSceneDocumentStore.getState().history.present

  if (!items.some((item) => item.id === previewedId)) {
    forceClearPreview()
  }
}

/**
 * Subscribes preview hygiene to the gates that must suppress it. Idempotent;
 * returns an unsubscribe. Runs an initial reconcile on start so a non-clean
 * starting state (e.g. interactions not yet ready) is handled like a change.
 */
export const startPreviewReconciler = createReconciler(() => {
  const unsubscribes = [
    useSceneSessionStore.subscribe(
      (state) => state.isDragging,
      reconcilePreview,
    ),
    subscribeToBlockingOverlay(reconcilePreview),
    useEditorLifecycleStore.subscribe(
      (state) => state.startupPhase === 'ready',
      reconcilePreview,
    ),
    useSceneDocumentStore.subscribe(
      (state) => state.history.present,
      reconcileDanglingPreview,
    ),
  ]

  reconcilePreview()
  reconcileDanglingPreview()

  return [...unsubscribes, cancelScenePreviewClear]
})
