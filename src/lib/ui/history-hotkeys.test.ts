import { describe, expect, it } from 'vitest'
import { getHistoryHotkeyIntent } from './history-hotkeys'

function createInput(
  overrides: Partial<Parameters<typeof getHistoryHotkeyIntent>[0]> = {},
) {
  return {
    key: 'z',
    altKey: false,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    isModalOpen: false,
    targetTagName: undefined,
    targetIsContentEditable: false,
    ...overrides,
  }
}

describe('getHistoryHotkeyIntent', () => {
  it('returns undo for ctrl/cmd+z', () => {
    expect(getHistoryHotkeyIntent(createInput())).toBe('undo')
    expect(
      getHistoryHotkeyIntent(createInput({ ctrlKey: false, metaKey: true })),
    ).toBe('undo')
  })

  it('returns redo for shift+ctrl/cmd+z and ctrl+y', () => {
    expect(getHistoryHotkeyIntent(createInput({ shiftKey: true }))).toBe('redo')
    expect(
      getHistoryHotkeyIntent(
        createInput({
          key: 'z',
          ctrlKey: false,
          metaKey: true,
          shiftKey: true,
        }),
      ),
    ).toBe('redo')
    expect(getHistoryHotkeyIntent(createInput({ key: 'y' }))).toBe('redo')
  })

  it('ignores keys without the undo modifier', () => {
    expect(
      getHistoryHotkeyIntent(createInput({ ctrlKey: false, metaKey: false })),
    ).toBeNull()
  })

  it('ignores editable targets and open modals', () => {
    expect(
      getHistoryHotkeyIntent(createInput({ targetTagName: 'INPUT' })),
    ).toBeNull()
    expect(
      getHistoryHotkeyIntent(createInput({ targetIsContentEditable: true })),
    ).toBeNull()
    expect(
      getHistoryHotkeyIntent(createInput({ isModalOpen: true })),
    ).toBeNull()
  })

  it('ignores unsupported modifier combinations', () => {
    expect(getHistoryHotkeyIntent(createInput({ altKey: true }))).toBeNull()
    expect(
      getHistoryHotkeyIntent(
        createInput({ key: 'y', ctrlKey: false, metaKey: true }),
      ),
    ).toBeNull()
  })
})
