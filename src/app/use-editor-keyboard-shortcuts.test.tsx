// @vitest-environment jsdom

import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useEditorKeyboardShortcuts } from './use-editor-keyboard-shortcuts'

function KeyboardShortcutHarness(props: {
  enabled: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isModalOpen: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenDeleteDialog: () => void
  onRotate: (direction: -1 | 1) => void
}) {
  useEditorKeyboardShortcuts(props)

  return <button type="button">Editor Root</button>
}

describe('useEditorKeyboardShortcuts', () => {
  it('blocks delete shortcuts when a modal is open and uses the latest modal state on rerender', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        canUndo={false}
        canRedo={false}
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Delete}')
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)

    view.rerender(
      <KeyboardShortcutHarness
        enabled
        canUndo={false}
        canRedo={false}
        hasSelection
        isModalOpen
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Delete}')
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('dispatches history and rotation shortcuts when enabled and no modal is open', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const onRotate = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        canUndo
        canRedo
        hasSelection
        isModalOpen={false}
        onUndo={onUndo}
        onRedo={onRedo}
        onOpenDeleteDialog={vi.fn()}
        onRotate={onRotate}
      />,
    )

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await user.keyboard('q')
    await user.keyboard('e')

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(onRotate).toHaveBeenNthCalledWith(1, 1)
    expect(onRotate).toHaveBeenNthCalledWith(2, -1)
  })
})
