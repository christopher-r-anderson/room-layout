import { msg } from '@lingui/core/macro'
import { i18n } from '@/shared/i18n/i18n'

export type SelectedItemDetailsBlockReason =
  | 'no-selection'
  | 'dragging'
  | 'blocked-collision'
  | 'blocked-bounds'
  | 'no-op'

export function formatSelectedItemDetailsBlockedMessage(
  fieldLabel: string,
  reason: SelectedItemDetailsBlockReason,
) {
  switch (reason) {
    case 'blocked-bounds':
      return i18n._(msg`${fieldLabel} must stay inside the room.`)
    case 'blocked-collision':
      return i18n._(msg`${fieldLabel} overlaps another item.`)
    case 'dragging':
      return i18n._(msg`Finish dragging before editing item details.`)
    case 'no-selection':
      return i18n._(msg`Select a furniture item first.`)
    case 'no-op':
      return ''
  }
}

export function formatSelectedItemDetailsInvalidValueMessage(
  fieldLabel: string,
) {
  return i18n._(msg`${fieldLabel} must be a valid number.`)
}
