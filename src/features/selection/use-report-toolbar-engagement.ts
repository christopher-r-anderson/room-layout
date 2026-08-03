import { useEffect, type FocusEvent } from 'react'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'

/**
 * Returns the DOM handlers to spread onto the toolbar's positioned wrapper.
 * Engagement resets whenever the (visibility, selection) context changes or
 * the wrapper unmounts: the wrapper can go away before its paired
 * pointer-leave/blur fires, and the rotation grace is a global latch, so a
 * stale flag or still-running grace timer would pin the next toolbar.
 * `showing` and `selectionKey` are the effect's trigger only - the cleanup
 * runs on every change and on unmount.
 */
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
      const nextFocused = event.relatedTarget

      if (
        !(nextFocused instanceof HTMLElement) ||
        !event.currentTarget.contains(nextFocused)
      ) {
        toolbarInteractionActions.setFocusWithin(false)
      }
    },
  }
}
