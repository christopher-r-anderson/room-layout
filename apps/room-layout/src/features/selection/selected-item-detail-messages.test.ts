import { describe, expect, it } from 'vitest'
import {
  formatSelectedItemDetailsBlockedMessage,
  formatSelectedItemDetailsInvalidValueMessage,
  type SelectedItemDetailsBlockReason,
} from './selected-item-detail-messages'

describe('formatSelectedItemDetailsBlockedMessage', () => {
  it.each<[SelectedItemDetailsBlockReason, string]>([
    ['blocked-bounds', 'Left wall must stay inside the room.'],
    ['blocked-collision', 'Left wall overlaps another item.'],
    ['dragging', 'Finish dragging before editing item details.'],
    ['no-selection', 'Select a furniture item first.'],
    ['no-op', ''],
  ])('formats the %s reason', (reason, expected) => {
    expect(formatSelectedItemDetailsBlockedMessage('Left wall', reason)).toBe(
      expected,
    )
  })

  it('interpolates the field label into field-specific reasons', () => {
    expect(
      formatSelectedItemDetailsBlockedMessage('Back wall', 'blocked-bounds'),
    ).toBe('Back wall must stay inside the room.')
  })
})

describe('formatSelectedItemDetailsInvalidValueMessage', () => {
  it('names the offending field', () => {
    expect(formatSelectedItemDetailsInvalidValueMessage('Rotation')).toBe(
      'Rotation must be a valid number.',
    )
  })
})
