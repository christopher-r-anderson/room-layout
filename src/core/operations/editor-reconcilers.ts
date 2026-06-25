import { startSelectionEffectsReconciler } from '@/core/operations/selection-effects'
import { startOutlinerFocusReconciler } from '@/core/operations/focus-actions'
import { startPreviewReconciler } from '@/core/operations/preview-reconciler'

/**
 * Starts the editor's standing reconcilers — the subscriptions that coordinate
 * derived writes across stores (selection effects, outliner focus, preview
 * hygiene). Idempotent, since each underlying reconciler guards itself; returns
 * an unsubscribe that stops them all.
 */
export function startEditorReconcilers(): () => void {
  const stops = [
    startSelectionEffectsReconciler(),
    startOutlinerFocusReconciler(),
    startPreviewReconciler(),
  ]

  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}
