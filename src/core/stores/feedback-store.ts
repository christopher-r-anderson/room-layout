import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EqualityChecker } from '../types/store.types'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180

interface FeedbackStoreState {
  politeAnnouncement: string
  assertiveAnnouncement: string
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAssertiveAnnouncement: () => void
  queueMovementAnnouncement: (message: string) => void
  clearQueuedMovementAnnouncement: () => void
  reset: () => void
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

export const feedbackStore = createStore<FeedbackStoreState>()(
  subscribeWithSelector((set) => {
    const clearQueuedMovementAnnouncement = () => {
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

    return {
      politeAnnouncement: '',
      assertiveAnnouncement: '',
      announcePolite: (message) => {
        if (!message) {
          return
        }

        clearQueuedMovementAnnouncement()
        // Clear first so screen readers re-announce when the same message
        // repeats. The '' update commits in the current task; the deferred
        // callback runs in a separate task, guaranteeing two distinct DOM
        // mutations.
        if (pendingPoliteSet !== null) {
          window.clearTimeout(pendingPoliteSet)
        }
        set({ politeAnnouncement: '' })
        pendingPoliteSet = window.setTimeout(() => {
          pendingPoliteSet = null
          set({ politeAnnouncement: message })
        }, 0)
      },
      queueMovementAnnouncement: (message) => {
        if (!message) {
          return
        }

        clearQueuedMovementAnnouncement()

        movementAnnouncementTimeout = window.setTimeout(() => {
          movementAnnouncementTimeout = null
          // Clear first so screen readers re-announce when the same message
          // repeats.
          if (pendingPoliteSet !== null) {
            window.clearTimeout(pendingPoliteSet)
          }
          set({ politeAnnouncement: '' })
          pendingPoliteSet = window.setTimeout(() => {
            pendingPoliteSet = null
            set({ politeAnnouncement: message })
          }, 0)
        }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
      },
      announceAssertive: (message) => {
        clearQueuedMovementAnnouncement()
        // Clear first so screen readers re-announce when the same message
        // repeats.
        if (pendingAssertiveSet !== null) {
          window.clearTimeout(pendingAssertiveSet)
        }
        set({ assertiveAnnouncement: '' })
        pendingAssertiveSet = window.setTimeout(() => {
          pendingAssertiveSet = null
          set({ assertiveAnnouncement: message })
        }, 0)
      },
      clearAssertiveAnnouncement: () => {
        clearQueuedMovementAnnouncement()
        if (pendingAssertiveSet !== null) {
          window.clearTimeout(pendingAssertiveSet)
          pendingAssertiveSet = null
        }
        set({ assertiveAnnouncement: '' })
      },
      clearQueuedMovementAnnouncement,
      reset: () => {
        clearPendingAnnouncementTimers()
        set({ politeAnnouncement: '', assertiveAnnouncement: '' })
      },
    }
  }),
)

function useFeedbackStore<T>(
  selector: (state: FeedbackStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(feedbackStore, selector, equalityFn)
}

export const feedbackActions = {
  announcePolite: (message: string) => {
    feedbackStore.getState().announcePolite(message)
  },
  announceAssertive: (message: string) => {
    feedbackStore.getState().announceAssertive(message)
  },
  clearAssertiveAnnouncement: () => {
    feedbackStore.getState().clearAssertiveAnnouncement()
  },
  queueMovementAnnouncement: (message: string) => {
    feedbackStore.getState().queueMovementAnnouncement(message)
  },
  clearQueuedMovementAnnouncement: () => {
    feedbackStore.getState().clearQueuedMovementAnnouncement()
  },
  reset: () => {
    feedbackStore.getState().reset()
  },
}

export function resetFeedbackStore() {
  feedbackActions.reset()
}

export const usePoliteAnnouncement = () =>
  useFeedbackStore((state) => state.politeAnnouncement)
export const useAssertiveAnnouncement = () =>
  useFeedbackStore((state) => state.assertiveAnnouncement)
