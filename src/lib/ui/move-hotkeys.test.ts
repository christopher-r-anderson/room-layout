import { describe, expect, it } from 'vitest'
import { getMoveHotkeyIntent } from './move-hotkeys'

describe('getMoveHotkeyIntent', () => {
  it('maps arrows to movement deltas with default step', () => {
    expect(
      getMoveHotkeyIntent({
        key: 'ArrowUp',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({
      delta: { x: 0, z: -0.5 },
      step: 0.5,
    })

    expect(
      getMoveHotkeyIntent({
        key: 'ArrowRight',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({
      delta: { x: 0.5, z: 0 },
      step: 0.5,
    })
  })

  it('supports shift and alt movement modifiers', () => {
    expect(
      getMoveHotkeyIntent({
        key: 'ArrowLeft',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
      }),
    ).toEqual({
      delta: { x: -1, z: 0 },
      step: 1,
    })

    expect(
      getMoveHotkeyIntent({
        key: 'ArrowDown',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toEqual({
      delta: { x: 0, z: 0.1 },
      step: 0.1,
    })
  })

  it('blocks movement in modals, editable targets, or command-modifier chords', () => {
    expect(
      getMoveHotkeyIntent({
        key: 'ArrowUp',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        isModalOpen: true,
      }),
    ).toBeNull()

    expect(
      getMoveHotkeyIntent({
        key: 'ArrowUp',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBeNull()

    expect(
      getMoveHotkeyIntent({
        key: 'ArrowUp',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        targetTagName: 'INPUT',
      }),
    ).toBeNull()
  })
})
