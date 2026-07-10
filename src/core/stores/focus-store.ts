import { create } from 'zustand'

/** The focus-routable editor surfaces; null means focus is elsewhere (chrome, body). */
export type FocusableSurface =
  | 'scene'
  | 'item-collection'
  | 'inspector'
  | 'item-actions'

// Where keyboard focus currently rests, written by each surface's own
// focus/blur handlers. Current location only — never a focus history.
// Session-scoped: never serialized, never part of the undo timeline.
interface FocusStoreState {
  focusedSurface: FocusableSurface | null
}

const useFocusStore = create<FocusStoreState>()(() => ({
  focusedSurface: null,
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

export const useIsSceneFocused = () =>
  useFocusStore((state) => state.focusedSurface === 'scene')
