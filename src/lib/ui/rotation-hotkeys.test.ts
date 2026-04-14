import { describe, expect, it } from 'vitest'
import { getRotationHotkeyDirection } from './rotation-hotkeys'

function createInput(
  overrides: Partial<Parameters<typeof getRotationHotkeyDirection>[0]> = {},
) {
  return {
    key: 'q',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isModalOpen: false,
    targetTagName: undefined,
    targetIsContentEditable: false,
    ...overrides,
  }
}

describe('getRotationHotkeyDirection', () => {
  it('returns left direction for q key', () => {
    expect(getRotationHotkeyDirection(createInput({ key: 'q' }))).toBe(-1)
    expect(getRotationHotkeyDirection(createInput({ key: 'Q' }))).toBe(-1)
  })

  it('returns right direction for e key', () => {
    expect(getRotationHotkeyDirection(createInput({ key: 'e' }))).toBe(1)
    expect(getRotationHotkeyDirection(createInput({ key: 'E' }))).toBe(1)
  })

  it('ignores unsupported keys', () => {
    expect(getRotationHotkeyDirection(createInput({ key: 'r' }))).toBeNull()
  })

  it('ignores keys with modifier chords', () => {
    expect(
      getRotationHotkeyDirection(createInput({ ctrlKey: true })),
    ).toBeNull()
    expect(
      getRotationHotkeyDirection(createInput({ metaKey: true })),
    ).toBeNull()
    expect(getRotationHotkeyDirection(createInput({ altKey: true }))).toBeNull()
  })

  it('ignores editable targets', () => {
    expect(
      getRotationHotkeyDirection(createInput({ targetTagName: 'INPUT' })),
    ).toBeNull()
    expect(
      getRotationHotkeyDirection(createInput({ targetTagName: 'TEXTAREA' })),
    ).toBeNull()
    expect(
      getRotationHotkeyDirection(createInput({ targetTagName: 'SELECT' })),
    ).toBeNull()
    expect(
      getRotationHotkeyDirection(
        createInput({ targetIsContentEditable: true }),
      ),
    ).toBeNull()
  })

  it('ignores hotkeys while a modal is open', () => {
    expect(
      getRotationHotkeyDirection(createInput({ key: 'q', isModalOpen: true })),
    ).toBeNull()
    expect(
      getRotationHotkeyDirection(createInput({ key: 'e', isModalOpen: true })),
    ).toBeNull()
  })
})
