import { startPendingFocusReconciler } from '@/core/operations/focus-actions'
import { startPreviewReconciler } from '@/core/operations/preview-reconciler'
import { startCollectionLoadReconciler } from '@/core/operations/collection-loader'
import { startDraftPersistenceReconciler } from '@/core/operations/draft-persistence'

/** Idempotent; returns an unsubscribe that stops every reconciler. */
export function startEditorReconcilers(): () => void {
  const stops = [
    startPendingFocusReconciler(),
    startPreviewReconciler(),
    startCollectionLoadReconciler(),
    startDraftPersistenceReconciler(),
  ]

  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}
