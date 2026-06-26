// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { Toolbar } from '@base-ui/react/toolbar'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import type { CommandDispatch } from '@/core/commands/command-dispatch-context'
import { HistoryTools } from './history-tools'

// HistoryTools renders a Toolbar.Group, so it only mounts inside a Toolbar.Root.
function renderWithDispatch(ui: ReactElement, dispatch: CommandDispatch) {
  return render(
    <CommandDispatchProvider value={dispatch}>
      <Toolbar.Root>{ui}</Toolbar.Root>
    </CommandDispatchProvider>,
  )
}

describe('HistoryTools', () => {
  it('exposes keyboard shortcuts for undo and redo', () => {
    renderWithDispatch(
      <HistoryTools canRedo canUndo editorInteractionsEnabled />,
      vi.fn(),
    )

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+Z',
    )
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+Shift+Z Control+Y',
    )
  })

  it('dispatches undo and redo commands on click', async () => {
    const user = userEvent.setup()
    const dispatch: CommandDispatch = vi.fn()

    renderWithDispatch(
      <HistoryTools canRedo canUndo editorInteractionsEnabled />,
      dispatch,
    )

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.click(screen.getByRole('button', { name: 'Redo' }))

    expect(vi.mocked(dispatch).mock.calls.map(([command]) => command)).toEqual([
      { kind: 'undo' },
      { kind: 'redo' },
    ])
  })

  it('is non-interactive when disabled', async () => {
    const user = userEvent.setup()
    const dispatch = vi.fn()

    renderWithDispatch(
      <HistoryTools canRedo canUndo editorInteractionsEnabled={false} />,
      dispatch,
    )

    const undoButton = screen.getByRole('button', { name: 'Undo' })
    const redoButton = screen.getByRole('button', { name: 'Redo' })

    // Disabled toolbar items stay focusable and surface the reason they are
    // unavailable to assistive tech (not only in the visual tooltip).
    expect(undoButton).toHaveAttribute('aria-disabled', 'true')
    expect(undoButton).toHaveAccessibleDescription(
      'Editor interactions are unavailable while loading',
    )

    await user.click(undoButton)
    await user.click(redoButton)

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('forwards toolbar sizing and explicit label visibility to the tool buttons', () => {
    renderWithDispatch(
      <HistoryTools
        canRedo
        canUndo
        displayLabels={true}
        buttonSize="toolbar"
        editorInteractionsEnabled
      />,
      vi.fn(),
    )

    const undoButton = screen.getByRole('button', { name: 'Undo' })
    const undoLabel = within(undoButton).getByText('Undo')

    expect(undoLabel.className).not.toContain('sr-only')
    expect(undoButton.className).toContain('h-9')
  })
})
