import type { MessageDescriptor } from '@lingui/core'
import type { RestoreOutcome } from '@/core/stores/editor-lifecycle-store'
import type { FeedbackMessage } from '@/core/stores/feedback-store'
import type { FurnitureInstance } from '@/domain/furniture'

export interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
}

export type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

// Injected feedback seam, speaking the feedback API's vocabulary so the flow
// states outcomes and cannot pick surfaces ad hoc.
export interface RestoreFlowNotifications {
  setRestoreOutcome: (outcome: RestoreOutcome) => void
  actionSuccess: (message: FeedbackMessage) => void
  actionWarning: (message: FeedbackMessage) => void
  actionError: (message: FeedbackMessage) => void
}

// Message descriptors, not resolved strings: the report helpers translate them
// with `i18n._()` at fire-time, so only the branch actually taken resolves.
// `title` names the specific failure; `description` states the consequence.
export interface InvalidRestoreCase {
  title: MessageDescriptor
  description: MessageDescriptor
}
