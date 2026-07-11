import { create } from 'zustand'
import type {
  FocusDirective,
  FocusableSurface,
} from '@/core/operations/focus-policy'

// Where keyboard focus currently rests (written by each surface's own
// focus/blur handlers — current location only, never a focus history) and the
// pending resolved focus directive awaiting realization by its surface.
// Session-scoped: never serialized, never part of the undo timeline.
interface FocusStoreState {
  focusedSurface: FocusableSurface | null
  pendingFocus: FocusDirective | null
}

const useFocusStore = create<FocusStoreState>()(() => ({
  focusedSurface: null,
  pendingFocus: null,
}))

export const focusActions = {
  surfaceFocused: (surface: FocusableSurface) => {
    useFocusStore.setState((state) =>
      state.focusedSurface === surface ? state : { focusedSurface: surface },
    )
  },
  // Blur handlers pass their own surface so a blur delivered after another
  // surface already claimed focus cannot clear the newer value.
  surfaceBlurred: (surface: FocusableSurface) => {
    useFocusStore.setState((state) =>
      state.focusedSurface === surface ? { focusedSurface: null } : state,
    )
  },
  // Last write wins: a newer intent supersedes an unrealized one.
  setPendingFocus: (directive: FocusDirective) => {
    useFocusStore.setState({ pendingFocus: directive })
  },
  // Consumers pass the directive they realized so a clear cannot drop a newer
  // directive that superseded it between render and effect.
  directiveRealized: (directive: FocusDirective) => {
    useFocusStore.setState((state) =>
      state.pendingFocus === directive ? { pendingFocus: null } : state,
    )
  },
  clearPendingFocus: () => {
    useFocusStore.setState((state) =>
      state.pendingFocus === null ? state : { pendingFocus: null },
    )
  },
  reset: () => {
    useFocusStore.setState(useFocusStore.getInitialState(), true)
  },
}

export function resetFocusStore() {
  focusActions.reset()
}

/** Non-reactive read of the focused surface for event-time checks. */
export function getFocusedSurface() {
  return useFocusStore.getState().focusedSurface
}

/** Non-reactive read of the pending directive for reconciler guards. */
export function getPendingFocus() {
  return useFocusStore.getState().pendingFocus
}

export const useIsSceneFocused = () =>
  useFocusStore((state) => state.focusedSurface === 'scene')

export const usePendingFocus = () =>
  useFocusStore((state) => state.pendingFocus)
