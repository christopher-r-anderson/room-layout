import { appToastManager } from './toast-manager'

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
 */
export const feedback = {
  /** Outcome notice for a completed global action. Auto-dismisses. */
  actionSuccess(message: FeedbackMessage): void {
    appToastManager.add({ ...message, type: 'success', priority: 'low' })
  },

  /** Degraded-outcome notice. Lingers longer than a success. */
  actionWarning(message: FeedbackMessage): void {
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
    appToastManager.add({
      ...message,
      type: 'error',
      priority: 'high',
      timeout: 0,
    })
  },
}
