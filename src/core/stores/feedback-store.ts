import { create } from 'zustand'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180

// Transient user-facing feedback channels. `politeAnnouncement` /
// `assertiveAnnouncement` are the a11y live regions; `statusMessage` is the
// visible status line. They share nothing but their nature — ephemeral messages
// surfaced to the user — which is exactly why they live together here.
interface FeedbackStoreState {
  politeAnnouncement: string
  assertiveAnnouncement: string
  statusMessage: string | null
}

// Timers live at module scope rather than in store state: they are imperative
// scheduling details, not reactive values, and there is a single announcement
// region for the app.
let movementAnnouncementTimeout: number | null = null
let pendingPoliteSet: number | null = null
let pendingAssertiveSet: number | null = null

function clearPendingAnnouncementTimers() {
  if (movementAnnouncementTimeout !== null) {
    window.clearTimeout(movementAnnouncementTimeout)
    movementAnnouncementTimeout = null
  }

  if (pendingPoliteSet !== null) {
    window.clearTimeout(pendingPoliteSet)
    pendingPoliteSet = null
  }

  if (pendingAssertiveSet !== null) {
    window.clearTimeout(pendingAssertiveSet)
    pendingAssertiveSet = null
  }
}

function clearQueuedMovementAnnouncement() {
  if (movementAnnouncementTimeout !== null) {
    window.clearTimeout(movementAnnouncementTimeout)
    movementAnnouncementTimeout = null
  }

  // Also cancel the inner 0 ms set-timer that the movement callback may have
  // already scheduled before this cancel arrived.
  if (pendingPoliteSet !== null) {
    window.clearTimeout(pendingPoliteSet)
    pendingPoliteSet = null
  }
}

// Clear first so screen readers re-announce when the same message repeats. The
// '' update commits in the current task; the deferred callback runs in a
// separate task, guaranteeing two distinct DOM mutations.
function setPoliteAnnouncementWithReclear(message: string) {
  if (pendingPoliteSet !== null) {
    window.clearTimeout(pendingPoliteSet)
  }
  useFeedbackStore.setState({ politeAnnouncement: '' })
  pendingPoliteSet = window.setTimeout(() => {
    pendingPoliteSet = null
    useFeedbackStore.setState({ politeAnnouncement: message })
  }, 0)
}

// Module-private: mutation goes through feedbackActions and reads through the
// narrow hooks below.
const useFeedbackStore = create<FeedbackStoreState>()(() => ({
  politeAnnouncement: '',
  assertiveAnnouncement: '',
  statusMessage: null,
}))

export const feedbackActions = {
  announcePolite: (message: string) => {
    if (!message) {
      return
    }

    clearQueuedMovementAnnouncement()
    setPoliteAnnouncementWithReclear(message)
  },
  announceAssertive: (message: string) => {
    clearQueuedMovementAnnouncement()
    // Clear first so screen readers re-announce when the same message repeats.
    if (pendingAssertiveSet !== null) {
      window.clearTimeout(pendingAssertiveSet)
    }
    useFeedbackStore.setState({ assertiveAnnouncement: '' })
    pendingAssertiveSet = window.setTimeout(() => {
      pendingAssertiveSet = null
      useFeedbackStore.setState({ assertiveAnnouncement: message })
    }, 0)
  },
  clearAssertiveAnnouncement: () => {
    clearQueuedMovementAnnouncement()
    if (pendingAssertiveSet !== null) {
      window.clearTimeout(pendingAssertiveSet)
      pendingAssertiveSet = null
    }
    useFeedbackStore.setState({ assertiveAnnouncement: '' })
  },
  queueMovementAnnouncement: (message: string) => {
    if (!message) {
      return
    }

    clearQueuedMovementAnnouncement()

    movementAnnouncementTimeout = window.setTimeout(() => {
      movementAnnouncementTimeout = null
      setPoliteAnnouncementWithReclear(message)
    }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
  },
  clearQueuedMovementAnnouncement,
  setStatusMessage: (message: string | null) => {
    useFeedbackStore.setState((state) =>
      state.statusMessage === message ? state : { statusMessage: message },
    )
  },
  clearStatusMessage: () => {
    useFeedbackStore.setState((state) =>
      state.statusMessage === null ? state : { statusMessage: null },
    )
  },
  // Clears every pending announcement timer along with the messages.
  reset: () => {
    clearPendingAnnouncementTimers()
    useFeedbackStore.setState(useFeedbackStore.getInitialState(), true)
  },
}

export function resetFeedbackStore() {
  feedbackActions.reset()
}

export const feedbackStoreForTests = {
  getState: () => useFeedbackStore.getState(),
}

export const usePoliteAnnouncement = () =>
  useFeedbackStore((state) => state.politeAnnouncement)
export const useAssertiveAnnouncement = () =>
  useFeedbackStore((state) => state.assertiveAnnouncement)
export const useStatusMessage = () =>
  useFeedbackStore((state) => state.statusMessage)
