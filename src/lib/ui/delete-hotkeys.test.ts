import { describe, expect, it } from 'vitest'
import { getDeleteHotkeyIntent } from './delete-hotkeys'

function createInput(
  overrides: Partial<Parameters<typeof getDeleteHotkeyIntent>[0]> = {},
) {
  return {
    key: 'Delete',
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isModalOpen: false,
    targetTagName: undefined,
    targetIsContentEditable: false,
    ...overrides,
  }
}

describe('getDeleteHotkeyIntent', () => {
  it('returns true for delete and backspace', () => {
    expect(getDeleteHotkeyIntent(createInput({ key: 'Delete' }))).toBe(true)
    expect(getDeleteHotkeyIntent(createInput({ key: 'Backspace' }))).toBe(true)
  })

  it('ignores unsupported keys', () => {
    expect(getDeleteHotkeyIntent(createInput({ key: 'q' }))).toBe(false)
  })

  it('ignores modifier chords', () => {
    expect(getDeleteHotkeyIntent(createInput({ altKey: true }))).toBe(false)
    expect(getDeleteHotkeyIntent(createInput({ ctrlKey: true }))).toBe(false)
    expect(getDeleteHotkeyIntent(createInput({ metaKey: true }))).toBe(false)
  })

  it('ignores editable targets', () => {
    expect(getDeleteHotkeyIntent(createInput({ targetTagName: 'INPUT' }))).toBe(
      false,
    )
    expect(
      getDeleteHotkeyIntent(createInput({ targetTagName: 'TEXTAREA' })),
    ).toBe(false)
    expect(
      getDeleteHotkeyIntent(createInput({ targetTagName: 'SELECT' })),
    ).toBe(false)
    expect(
      getDeleteHotkeyIntent(createInput({ targetIsContentEditable: true })),
    ).toBe(false)
  })

  it('ignores delete while a modal is open', () => {
    expect(getDeleteHotkeyIntent(createInput({ isModalOpen: true }))).toBe(
      false,
    )
  })
})
