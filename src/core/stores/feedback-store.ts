import { create } from 'zustand'
import { Toast } from '@base-ui/react/toast'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180
const WARNING_TIMEOUT_MS = 8_000

/** A user-facing notice; `title` leads, `description` adds consequence/detail. */
interface FeedbackMessage {
  title: string
  description?: string
}

// A channel's message plus a monotonic nonce: the Announcer keys a fresh DOM
// node off the nonce, so a repeated message still re-announces.
interface Announcement {
  text: string
  nonce: number
}

interface FeedbackStoreState {
  polite: Announcement
  assertive: Announcement
}

/**
 * The toast half of the feedback surface. Exported only so the app shell can
 * hand it to `AppToaster`; everything else goes through `feedback`.
 */
export const appToastManager = Toast.createToastManager()

let movementAnnouncementTimeout: number | null = null
let nonceCounter = 0

function clearQueuedMovementAnnouncement() {
  if (movementAnnouncementTimeout !== null) {
    window.clearTimeout(movementAnnouncementTimeout)
    movementAnnouncementTimeout = null
  }
}

// Module-private: mutation goes through `feedback` and reads through the
// narrow hooks below.
const useFeedbackStore = create<FeedbackStoreState>()(() => ({
  polite: { text: '', nonce: 0 },
  assertive: { text: '', nonce: 0 },
}))

function announce(channel: 'polite' | 'assertive', text: string) {
  if (!text) {
    return
  }

  clearQueuedMovementAnnouncement()
  nonceCounter += 1
  useFeedbackStore.setState({ [channel]: { text, nonce: nonceCounter } })
}

function raiseToast(
  message: FeedbackMessage,
  options: {
    type: 'success' | 'warning' | 'error'
    priority: 'low' | 'high'
    timeout?: number
  },
) {
  clearQueuedMovementAnnouncement()
  appToastManager.add({ ...message, ...options })
}

/**
 * The sanctioned entry points for user feedback: call sites state the event
 * class, the surface routing lives here. When to use which entry is covered
 * in docs/architecture/feedback.md. Messages arrive already translated.
 *
 * Every entry cancels a pending debounced movement announcement, so a stale
 * position never announces after the outcome that superseded it.
 */
export const feedback = {
  /** Outcome notice for a completed global action. Toast, auto-dismisses. */
  actionSuccess: (message: FeedbackMessage): void => {
    raiseToast(message, { type: 'success', priority: 'low' })
  },

  /** Degraded-outcome notice. Toast, lingers longer than a success. */
  actionWarning: (message: FeedbackMessage): void => {
    raiseToast(message, {
      type: 'warning',
      priority: 'low',
      timeout: WARNING_TIMEOUT_MS,
    })
  },

  /**
   * A failed user action. Toast, announced assertively and kept on screen
   * until dismissed (an auto-dismissing error can vanish before it is read).
   */
  actionError: (message: FeedbackMessage): void => {
    raiseToast(message, { type: 'error', priority: 'high', timeout: 0 })
  },

  /** SR-only polite note for an outcome that is already visible on screen. */
  interactionUpdate: (text: string): void => {
    announce('polite', text)
  },

  /**
   * SR-only polite note for continuous movement, debounced so rapid
   * keypresses announce only the settled state.
   */
  movementUpdate: (text: string): void => {
    if (!text) {
      return
    }

    clearQueuedMovementAnnouncement()

    movementAnnouncementTimeout = window.setTimeout(() => {
      movementAnnouncementTimeout = null
      announce('polite', text)
    }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
  },

  /**
   * SR-only assertive note for a rejected form input; the visible error text
   * stays with the field (aria-invalid + aria-describedby).
   */
  formError: (text: string): void => {
    announce('assertive', text)
  },

  /**
   * Clears both announcement channels, the pending debounce, and all toasts -
   * a fresh startup cycle must not carry pre-reset notices.
   */
  reset: (): void => {
    clearQueuedMovementAnnouncement()
    useFeedbackStore.setState(useFeedbackStore.getInitialState(), true)
    appToastManager.close()
  },
}

export function resetFeedbackStore() {
  feedback.reset()
}

export const feedbackStoreForTests = {
  getState: () => useFeedbackStore.getState(),
}

export const usePoliteAnnouncement = () =>
  useFeedbackStore((state) => state.polite)
export const useAssertiveAnnouncement = () =>
  useFeedbackStore((state) => state.assertive)
