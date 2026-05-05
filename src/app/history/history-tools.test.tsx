// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HistoryTools } from './history-tools'

describe('HistoryTools', () => {
  it('exposes keyboard shortcuts for undo and redo', () => {
    render(
      <HistoryTools
        canRedo
        canUndo
        editorInteractionsEnabled
        onRedo={vi.fn()}
        onUndo={vi.fn()}
      />,
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

  it('is non-interactive when disabled', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    render(
      <HistoryTools
        canRedo
        canUndo
        editorInteractionsEnabled={false}
        onRedo={onRedo}
        onUndo={onUndo}
      />,
    )

    const undoButton = screen.getByRole('button', { name: 'Undo' })
    const redoButton = screen.getByRole('button', { name: 'Redo' })

    await user.hover(undoButton)

    expect(
      await screen.findByText(
        'Editor interactions are unavailable while loading',
      ),
    ).toBeVisible()

    await user.click(undoButton)
    await user.click(redoButton)

    expect(onUndo).not.toHaveBeenCalled()
    expect(onRedo).not.toHaveBeenCalled()
  })
})
