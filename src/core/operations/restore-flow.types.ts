import type { MessageDescriptor } from '@lingui/core'
import type { RestoreOutcome } from '@/core/stores/editor-lifecycle-store'
import type { FurnitureInstance } from '@/domain/furniture'

export interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
}

export type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

export interface RestoreFlowNotifications {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  setStatusMessage: (message: string) => void
  setRestoreOutcome: (outcome: RestoreOutcome) => void
  toastSuccess: (message: string) => void
  toastWarning: (message: string) => void
  toastError: (message: string) => void
}

// Message descriptors, not resolved strings: the report helpers translate them
// with `i18n._()` at fire-time, so only the branch actually taken resolves.
export interface InvalidRestoreCase {
  statusMessage: MessageDescriptor
  assertiveMessage: MessageDescriptor
  toastMessage: MessageDescriptor
}
