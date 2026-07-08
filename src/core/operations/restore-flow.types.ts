import type { MessageDescriptor } from '@lingui/core'
import type { FurnitureInstance } from '@/domain/furniture'

export interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
}

export type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

// Message descriptors, not resolved strings: the report helpers translate them
// with `i18n._()` at fire-time, so only the branch actually taken resolves.
// `title` names the specific failure; `description` states the consequence.
export interface InvalidRestoreCase {
  title: MessageDescriptor
  description: MessageDescriptor
}
