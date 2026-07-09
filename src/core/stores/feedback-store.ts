import { create } from 'zustand'
import { Toast } from '@base-ui/react/toast'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180
const WARNING_TIMEOUT_MS = 8_000

/** A user-facing notice; `title` leads, `description` adds consequence/detail. */
export interface FeedbackMessage {
  title: string
  description?: string
}

// An announcement channel's message plus a monotonic nonce. The Announcer keys
// a fresh DOM node off the nonce, so repeating the same text is still a new
// "addition" for screen readers and re-announces.
interface Announcement {
  text: string
  nonce: number
}

interface FeedbackStoreState {
  polite: Announcement
  assertive: Announcement
}

/**
 * The toast half of the feedback surface. Module-level so plain functions
 * (operations, feature actions) can raise toasts without React; exported only
 * so the app shell can hand it to `AppToaster`, whose provider subscribes to
 * it - everything else goes through `feedback`.
 */
export const appToastManager = Toast.createToastManager()

// The debounce timer lives at module scope rather than in store state: it is
// an imperative scheduling detail, not a reactive value, and there is a single
// announcement region for the app.
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
 * The sanctioned entry points for user feedback. Call sites state the domain
 * class of the event; the surface routing lives here, per the policy in
 * docs/architecture/feedback.md. Messages arrive already translated.
 *
 * Every entry is one surface set: toasts announce through the viewport's own
 * live regions (priority high = assertive), announcer entries are SR-only.
 * Explicit feedback cancels a pending debounced movement announcement so a
 * stale position never announces after the outcome that superseded it.
 */
export const feedback = {
  /** Outcome notice for a completed global action. Auto-dismisses. */
  actionSuccess(message: FeedbackMessage): void {
    raiseToast(message, { type: 'success', priority: 'low' })
  },

  /** Degraded-outcome notice. Lingers longer than a success. */
  actionWarning(message: FeedbackMessage): void {
    raiseToast(message, {
      type: 'warning',
      priority: 'low',
      timeout: WARNING_TIMEOUT_MS,
    })
  },

  /**
   * A failed user action. Announced assertively and kept on screen until
   * dismissed: errors are rare and actionable, and an auto-dismissing error
   * can vanish before a screen-reader or sighted user reaches it.
   */
  actionError(message: FeedbackMessage): void {
    raiseToast(message, { type: 'error', priority: 'high', timeout: 0 })
  },

  /**
   * SR-only polite note for an interaction whose visual outcome is already
   * on screen (selection, add/delete, undo/redo, committed edits).
   */
  interactionUpdate(text: string): void {
    announce('polite', text)
  },

  /**
   * SR-only polite note for continuous movement (keyboard move/rotate),
   * debounced so rapid keypresses announce only the settled state.
   */
  movementUpdate(text: string): void {
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
   * SR-only assertive note for a rejected form input. The visible error text
   * is the caller's: rendered inline next to the field with aria-invalid and
   * aria-describedby.
   */
  formError(text: string): void {
    announce('assertive', text)
  },

  /**
   * Resets the whole feedback surface: clears both announcement channels and
   * any pending debounce, and closes all toasts - a fresh startup cycle must
   * not carry notices that describe the pre-reset world.
   */
  reset(): void {
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
