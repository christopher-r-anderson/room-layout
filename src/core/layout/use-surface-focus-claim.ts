import { useCallback, useMemo, type FocusEvent } from 'react'
import { focusActions } from '@/core/stores/focus-store'
import type { FocusableSurface } from '@/core/operations/focus-policy'
import { isFocusLeaving } from '@/shared/lib/focus'

/**
 * The surface side of focused-surface tracking: focus/blur handlers that
 * maintain the claim, plus a stable ref callback that releases it on real
 * unmount — removing a focused element fires no blur event, so the claim
 * would otherwise go stale. Compose claimRef into the surface's own ref
 * callback; all three values are referentially stable per surface.
 */
export function useSurfaceFocusClaim(surface: FocusableSurface) {
  const claimRef = useCallback(
    (element: HTMLElement | null) => {
      if (element === null) {
        focusActions.surfaceBlurred(surface)
      }
    },
    [surface],
  )

  const onFocus = useCallback(() => {
    focusActions.surfaceFocused(surface)
  }, [surface])

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (isFocusLeaving(event)) {
        focusActions.surfaceBlurred(surface)
      }
    },
    [surface],
  )

  // A stable object, not just stable members: consumers compose claimRef into
  // ref callbacks whose deps include this value, and an identity change there
  // makes React detach/reattach the ref every render — firing claimRef(null)
  // and wrongly releasing a held claim.
  return useMemo(
    () => ({ claimRef, onFocus, onBlur }),
    [claimRef, onFocus, onBlur],
  )
}
