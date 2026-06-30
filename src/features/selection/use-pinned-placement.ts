import { useState } from 'react'
import type { SelectedItemPlacement } from './selected-item-placement.types'

// While the toolbar is pinned, hold its last floating placement so its on-screen
// position stops tracking the object's re-projected geometry. The instant the
// pin releases, the live placement flows through again and the float site's CSS
// transition glides the toolbar to its current spot. Only floating placements
// hold: the held placement must be floating (so the pin can't engage before the
// first floating frame — cold start, or just after a selection change), and a
// live hidden placement always wins (the toolbar is gone, so never keep showing
// a stale pinned position).
export function resolveHeldPlacement(
  heldPlacement: SelectedItemPlacement,
  livePlacement: SelectedItemPlacement,
  pinned: boolean,
): SelectedItemPlacement {
  if (
    pinned &&
    heldPlacement.site === 'floating' &&
    livePlacement.site === 'floating'
  ) {
    return heldPlacement
  }

  return livePlacement
}

interface PinnedPlacementHold {
  resetKey: string
  pinned: boolean
  placement: SelectedItemPlacement
}

// React wrapper around resolveHeldPlacement. It uses React's documented "adjust
// state during render" pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders):
// the setHold call below updates this component's own state during its own
// render, which React handles by re-rendering immediately without warning, and
// the guard makes it converge in one extra pass — so it reads no refs during
// render and does not loop under StrictMode. The held placement is (re)captured
// from the live one only at the moment the pin engages, so the frozen-while-
// pinned path never calls setState — camera motion under a pinned toolbar costs
// no extra render. `resetKey` force-releases the hold when the placement context
// changes (a new selection or geometry source) so a stale pinned position can
// never bleed onto a different object.
export function usePinnedPlacement(
  livePlacement: SelectedItemPlacement,
  pinned: boolean,
  resetKey: string,
): SelectedItemPlacement {
  const [hold, setHold] = useState<PinnedPlacementHold>({
    resetKey,
    pinned,
    placement: livePlacement,
  })

  const contextChanged = hold.resetKey !== resetKey
  const pinJustEngaged = pinned && !hold.pinned
  // While unpinned the snapshot is never read (we show the live placement), so
  // it is deliberately left stale and refreshed here the instant the pin engages.
  const heldPlacement =
    contextChanged || pinJustEngaged ? livePlacement : hold.placement

  const nextPlacement = resolveHeldPlacement(
    heldPlacement,
    livePlacement,
    pinned,
  )

  if (
    contextChanged ||
    hold.pinned !== pinned ||
    (pinned && hold.placement !== nextPlacement)
  ) {
    setHold({ resetKey, pinned, placement: nextPlacement })
  }

  return nextPlacement
}
