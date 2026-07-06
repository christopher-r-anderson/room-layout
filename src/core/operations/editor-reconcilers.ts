import { startSelectionEffectsReconciler } from '@/core/operations/selection-effects'
import { startOutlinerFocusReconciler } from '@/core/operations/focus-actions'
import { startPreviewReconciler } from '@/core/operations/preview-reconciler'
import { startCollectionLoadReconciler } from '@/core/operations/collection-loader'
import { startDraftPersistenceReconciler } from '@/core/operations/draft-persistence'

/**
 * Starts the editor's standing reconcilers — the subscriptions that coordinate
 * derived writes across stores (selection effects, outliner focus, preview
 * hygiene, collection loading, draft persistence). Idempotent, since each
 * underlying reconciler guards itself; returns an unsubscribe that stops them
 * all.
 */
export function startEditorReconcilers(): () => void {
  const stops = [
    startSelectionEffectsReconciler(),
    startOutlinerFocusReconciler(),
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
