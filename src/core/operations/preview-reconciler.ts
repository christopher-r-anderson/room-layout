import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
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
  const isDragging = useSceneDocumentStore.getState().isDragging

  if (!isDragging && !isBlockingOverlayOpen() && isEditorInteractive()) {
    return
  }

  forceClearPreview()
}

/**
 * Subscribes preview hygiene to the gates that must suppress it. Idempotent;
 * returns an unsubscribe. Runs an initial reconcile on start so a non-clean
 * starting state (e.g. interactions not yet ready) is handled like a change.
 */
export const startPreviewReconciler = createReconciler(() => {
  const unsubscribes = [
    useSceneDocumentStore.subscribe(
      (state) => state.isDragging,
      reconcilePreview,
    ),
    subscribeToBlockingOverlay(reconcilePreview),
    useEditorLifecycleStore.subscribe(
      (state) => state.startupPhase === 'ready',
      reconcilePreview,
    ),
  ]

  reconcilePreview()

  return [...unsubscribes, cancelScenePreviewClear]
})
