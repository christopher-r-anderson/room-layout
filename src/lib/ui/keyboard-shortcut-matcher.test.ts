// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  matchKeyCombo,
  matchesKeyCombo,
  type KeyCombo,
} from './keyboard-shortcut-matcher'

function createKeyEvent(
  key: string,
  code?: string,
  init: Pick<
    KeyboardEventInit,
    'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
  > = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    code,
    ...init,
  })
}

describe('keyboard-shortcut-matcher', () => {
  it('matches case-insensitive key values', () => {
    const event = createKeyEvent('Z')
    expect(matchKeyCombo(event, { key: 'z' })).toBe(true)
  })

  it('matches ctrlOrMeta using either ctrl or meta modifier', () => {
    const ctrlEvent = createKeyEvent('z', undefined, { ctrlKey: true })
    const metaEvent = createKeyEvent('z', undefined, { metaKey: true })
    const combo: KeyCombo = { key: 'z', ctrlOrMeta: true }

    expect(matchKeyCombo(ctrlEvent, combo)).toBe(true)
    expect(matchKeyCombo(metaEvent, combo)).toBe(true)
  })

  it('requires exact modifier parity for shift and alt', () => {
    const event = createKeyEvent('ArrowUp', undefined, { shiftKey: true })

    expect(matchKeyCombo(event, { key: 'ArrowUp', shift: true })).toBe(true)
    expect(matchKeyCombo(event, { key: 'ArrowUp' })).toBe(false)
    expect(matchKeyCombo(event, { key: 'ArrowUp', alt: true })).toBe(false)
  })

  it('matches any combo in an array', () => {
    const event = createKeyEvent('y', undefined, { ctrlKey: true })

    expect(
      matchesKeyCombo(event, [
        { key: 'z', ctrlOrMeta: true, shift: true },
        { key: 'y', ctrlOrMeta: true },
      ]),
    ).toBe(true)
  })

  it('returns false when no combo matches', () => {
    const event = createKeyEvent('x', undefined, { ctrlKey: true })

    expect(matchesKeyCombo(event, { key: 'z', ctrlOrMeta: true })).toBe(false)
  })

  it('matches shortcuts by physical key code', () => {
    const event = createKeyEvent('!', 'Digit1', { shiftKey: true })

    expect(matchKeyCombo(event, { code: 'Digit1', shift: true })).toBe(true)
    expect(matchKeyCombo(event, { code: 'Digit1' })).toBe(false)
  })

  it('returns false when neither key nor code are provided', () => {
    const event = createKeyEvent('z')

    expect(matchKeyCombo(event, {})).toBe(false)
  })
})
