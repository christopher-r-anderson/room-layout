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
      return `${fieldLabel} must stay inside the room.`
    case 'blocked-collision':
      return `${fieldLabel} overlaps another item.`
    case 'dragging':
      return 'Finish dragging before editing item details.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}

export function formatSelectedItemDetailsInvalidValueMessage(
  fieldLabel: string,
) {
  return `${fieldLabel} must be a valid number.`
}
