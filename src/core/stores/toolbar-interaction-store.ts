import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

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
  setPointerOver: (pointerOver: boolean) => void
  setFocusWithin: (focusWithin: boolean) => void
  reportRotation: () => void
  reset: () => void
}

let rotationGraceTimer: ReturnType<typeof setTimeout> | null = null

function clearRotationGraceTimer() {
  if (rotationGraceTimer !== null) {
    clearTimeout(rotationGraceTimer)
    rotationGraceTimer = null
  }
}

export const toolbarInteractionStore =
  createStore<ToolbarInteractionStoreState>()((set) => ({
    pointerOver: false,
    focusWithin: false,
    rotationGraceActive: false,
    setPointerOver: (pointerOver) => {
      set({ pointerOver })
    },
    setFocusWithin: (focusWithin) => {
      set({ focusWithin })
    },
    reportRotation: () => {
      clearRotationGraceTimer()
      rotationGraceTimer = setTimeout(() => {
        rotationGraceTimer = null
        toolbarInteractionStore.setState({ rotationGraceActive: false })
      }, ROTATION_PIN_GRACE_MS)
      set({ rotationGraceActive: true })
    },
    reset: () => {
      clearRotationGraceTimer()
      set({
        pointerOver: false,
        focusWithin: false,
        rotationGraceActive: false,
      })
    },
  }))

export const toolbarInteractionActions = {
  setPointerOver: (pointerOver: boolean) => {
    toolbarInteractionStore.getState().setPointerOver(pointerOver)
  },
  setFocusWithin: (focusWithin: boolean) => {
    toolbarInteractionStore.getState().setFocusWithin(focusWithin)
  },
  reportRotation: () => {
    toolbarInteractionStore.getState().reportRotation()
  },
}

export function resetToolbarInteractionStore() {
  toolbarInteractionStore.getState().reset()
}

export function selectToolbarEngaged(state: ToolbarInteractionStoreState) {
  return state.pointerOver || state.focusWithin || state.rotationGraceActive
}

export const useToolbarEngaged = () =>
  useStore(toolbarInteractionStore, selectToolbarEngaged)
