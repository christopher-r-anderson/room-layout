import { useEffect, type FocusEvent } from 'react'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'

// Detects engagement with the selected-item toolbar and reports it to the
// interaction store, which the placement engine reads to pin the toolbar's
// position while the user is operating it (see use-pinned-placement). Returns the
// DOM handlers to spread onto the toolbar's positioned wrapper; the caller only
// owns layout, this owns the "is the user using it" policy.
//
// Engagement is scoped to the current selection's toolbar: it resets whenever the
// toolbar's (visibility, selection) context changes or the wrapper unmounts. The
// wrapper can be removed or retargeted before its paired pointer-leave/blur
// fires, and the rotation grace is a global latch, so without the reset a stale
// flag (or a still-running grace timer) would pin the next toolbar. `showing` and
// `selectionKey` are the effect's trigger only — the cleanup runs on every change
// (including one that starts while the toolbar is already hidden) and on unmount.
export function useReportToolbarEngagement(
  showing: boolean,
  selectionKey: string | null,
) {
  useEffect(() => {
    return () => {
      toolbarInteractionActions.reset()
    }
  }, [showing, selectionKey])

  return {
    onPointerEnter: () => {
      toolbarInteractionActions.setPointerOver(true)
    },
    onPointerLeave: () => {
      toolbarInteractionActions.setPointerOver(false)
    },
    onFocus: () => {
      toolbarInteractionActions.setFocusWithin(true)
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // Focus moving between the toolbar's own controls (roving tab order)
      // bubbles a blur here; only clear when focus actually leaves the wrapper,
      // so keyboard users operating it stay pinned.
      if (!event.currentTarget.contains(event.relatedTarget)) {
        toolbarInteractionActions.setFocusWithin(false)
      }
    },
  }
}
