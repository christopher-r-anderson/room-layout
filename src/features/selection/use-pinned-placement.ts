import { useState } from 'react'
import type { SelectedItemPlacement } from './selected-item-placement.types'

/**
 * While pinned, hold the last floating placement so the toolbar stops tracking
 * the object's re-projected geometry; on release the live placement flows
 * through again. Both placements must be floating: the pin can't engage before
 * the first floating frame, and a live hidden placement always wins (never
 * keep showing a stale pinned position).
 */
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

/**
 * The adjust-state-during-render pattern
 * (https://react.dev/reference/react/useState#storing-information-from-previous-renders):
 * the held placement is captured only as the pin engages, so the
 * frozen-while-pinned path never calls setState - camera motion under a pinned
 * toolbar costs no extra render. `resetKey` force-releases the hold so a
 * pinned position can't bleed onto a different object.
 */
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
