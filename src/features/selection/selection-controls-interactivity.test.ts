import { describe, expect, it } from 'vitest'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'

describe('resolveSelectionControlsInteractivity', () => {
  it('disables the controls with a reason while the editor is loading', () => {
    expect(
      resolveSelectionControlsInteractivity({
        editorInteractionsEnabled: false,
      }),
    ).toEqual({
      disabled: true,
      disabledMessage: 'Editor interactions are unavailable while loading',
    })
  })

  it('enables the controls once interactions are ready', () => {
    expect(
      resolveSelectionControlsInteractivity({
        editorInteractionsEnabled: true,
      }),
    ).toEqual({ disabled: false, disabledMessage: '' })
  })
})
