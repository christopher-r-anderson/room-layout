import { create } from 'zustand'

// Tracks whether the user is actively engaging the selected-item toolbar so the
// placement engine can pin the toolbar's screen position instead of letting it
// chase the object's projected geometry. The toolbar is "engaged" while the
// pointer is over it, focus is within it, or a rotation happened within the
// grace window — the last covers tapping a rotate button repeatedly with pauses,
// where each press re-projects the object and would otherwise walk the toolbar
// out from under the cursor. Kept apart from the geometry store (its sibling
// one-writer/one-reader pipe) because the two share nothing but the toolbar.
const ROTATION_PIN_GRACE_MS = 600

interface ToolbarInteractionStoreState {
  pointerOver: boolean
  focusWithin: boolean
  rotationGraceActive: boolean
}

let rotationGraceTimer: ReturnType<typeof setTimeout> | null = null

function clearRotationGraceTimer() {
  if (rotationGraceTimer !== null) {
    clearTimeout(rotationGraceTimer)
    rotationGraceTimer = null
  }
}

// Module-private: mutation goes through toolbarInteractionActions and the
// placement engine reads through useToolbarEngaged.
const useToolbarInteractionStore = create<ToolbarInteractionStoreState>()(
  () => ({
    pointerOver: false,
    focusWithin: false,
    rotationGraceActive: false,
  }),
)

export const toolbarInteractionActions = {
  setPointerOver: (pointerOver: boolean) => {
    useToolbarInteractionStore.setState({ pointerOver })
  },
  setFocusWithin: (focusWithin: boolean) => {
    useToolbarInteractionStore.setState({ focusWithin })
  },
  reportRotation: () => {
    clearRotationGraceTimer()
    rotationGraceTimer = setTimeout(() => {
      rotationGraceTimer = null
      useToolbarInteractionStore.setState({ rotationGraceActive: false })
    }, ROTATION_PIN_GRACE_MS)
    useToolbarInteractionStore.setState({ rotationGraceActive: true })
  },
  // Clears every engagement flag and cancels the pending grace timer in one call.
  reset: () => {
    clearRotationGraceTimer()
    useToolbarInteractionStore.setState(
      useToolbarInteractionStore.getInitialState(),
      true,
    )
  },
}

export function resetToolbarInteractionStore() {
  toolbarInteractionActions.reset()
}

export function selectToolbarEngaged(state: ToolbarInteractionStoreState) {
  return state.pointerOver || state.focusWithin || state.rotationGraceActive
}

export const toolbarInteractionStoreForTests = {
  getState: () => useToolbarInteractionStore.getState(),
}

export const useToolbarEngaged = () =>
  useToolbarInteractionStore(selectToolbarEngaged)
