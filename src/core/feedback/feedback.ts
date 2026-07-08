import { appToastManager } from './toast-manager'
import {
  announceAssertive,
  announcePolite,
  clearQueuedMovementAnnouncement,
  queueMovementAnnouncement,
  resetAnnouncements,
} from './announcement-store'

/** A user-facing notice; `title` leads, `description` adds consequence/detail. */
export interface FeedbackMessage {
  title: string
  description?: string
}

const WARNING_TIMEOUT_MS = 8_000

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
    clearQueuedMovementAnnouncement()
    appToastManager.add({ ...message, type: 'success', priority: 'low' })
  },

  /** Degraded-outcome notice. Lingers longer than a success. */
  actionWarning(message: FeedbackMessage): void {
    clearQueuedMovementAnnouncement()
    appToastManager.add({
      ...message,
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
    clearQueuedMovementAnnouncement()
    appToastManager.add({
      ...message,
      type: 'error',
      priority: 'high',
      timeout: 0,
    })
  },

  /**
   * SR-only polite note for an interaction whose visual outcome is already
   * on screen (selection, add/delete, undo/redo, committed edits).
   */
  interactionUpdate(text: string): void {
    announcePolite(text)
  },

  /**
   * SR-only polite note for continuous movement (keyboard move/rotate),
   * debounced so rapid keypresses announce only the settled state.
   */
  movementUpdate(text: string): void {
    queueMovementAnnouncement(text)
  },

  /**
   * SR-only assertive note for a rejected form input. The visible error text
   * is the caller's: rendered inline next to the field with aria-invalid and
   * aria-describedby.
   */
  formError(text: string): void {
    announceAssertive(text)
  },

  /** Clears both announcement channels and any pending debounce timer. */
  reset(): void {
    resetAnnouncements()
  },
}
