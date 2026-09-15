import { create } from 'zustand'

// While the toolbar is engaged (pointer over, focus within, or a rotation
// inside the grace window) the placement engine pins its screen position
// instead of chasing the object's projected geometry. The grace window covers
// repeated rotate taps, where each press re-projects the object and would walk
// the toolbar out from under the cursor.
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
