import { useLayoutEffect } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { focusActions, usePendingFocus } from '@/core/stores/focus-store'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { SelectedItemToolbar } from './selected-item-toolbar'
import { useReportToolbarEngagement } from './use-report-toolbar-engagement'

/**
 * Desktop mount for the selected-item toolbar: positions it near the selected
 * object using the computed placement. The toolbar content and behavior live in
 * SelectedItemToolbar, and useReportToolbarEngagement owns the engagement policy
 * that pins the position while the user is using it; this wrapper only owns where
 * it floats.
 */
export function FloatingSelectedItemSite() {
  const placement = useSelectedItemPlacement()
  const actionsSizeRef = useSelectedItemActionsSizeRef()
  const selectedFurniture = useSelectedFurniture()

  const isFloating = selectedFurniture !== null && placement.site === 'floating'
  const engagementHandlers = useReportToolbarEngagement(
    isFloating,
    selectedFurniture?.id ?? null,
  )
  const pendingFocus = usePendingFocus()
  const unrealizableDirective =
    pendingFocus?.surface === 'item-actions' && !isFloating
      ? pendingFocus
      : null
  const hasSelection = selectedFurniture !== null

  // This site owns the desktop toolbar's mounting, so it also owns the
  // directive the hidden toolbar cannot realize: forward it to the inspector
  // (which carries the same actions), or drop it if the selection is gone.
  useLayoutEffect(() => {
    if (!unrealizableDirective) {
      return
    }

    if (hasSelection) {
      focusActions.setPendingFocus({ surface: 'inspector' })
    } else {
      focusActions.directiveRealized(unrealizableDirective)
    }
  }, [unrealizableDirective, hasSelection])

  if (selectedFurniture === null) {
    return null
  }
  if (placement.site !== 'floating') {
    return null
  }

  return (
    // Positioning wrapper only: the toolbar inside carries the accessible name.
    <div
      ref={actionsSizeRef}
      // The placement engine emits viewport pixels, so `fixed top-0 left-0`
      // anchors the JS-computed translate3d below at the viewport origin; the
      // pixel offsets are physical, so the anchor stays physical, not logical.
      className="fixed top-0 left-0 pointer-events-auto transition-[transform,opacity] duration-150 ease-out"
      data-selected-toolbar-candidate={placement.candidateId}
      data-selected-toolbar-mode="floating"
      style={{
        transform: `translate3d(${String(placement.left)}px, ${String(placement.top)}px, 0)`,
      }}
      {...engagementHandlers}
    >
      <SelectedItemToolbar />
    </div>
  )
}
