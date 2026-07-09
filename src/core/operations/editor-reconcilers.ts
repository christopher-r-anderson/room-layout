import { startPreviewReconciler } from '@/core/operations/preview-reconciler'
import { startCollectionLoadReconciler } from '@/core/operations/collection-loader'
import { startDraftPersistenceReconciler } from '@/core/operations/draft-persistence'

/**
 * Starts the editor's standing reconcilers — the subscriptions that coordinate
 * derived writes across stores (preview hygiene, collection loading, draft
 * persistence). Idempotent, since each underlying reconciler guards itself;
 * returns an unsubscribe that stops them all.
 */
export function startEditorReconcilers(): () => void {
  const stops = [
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
