// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectedItemTools } from './selected-item-tools'

describe('SelectedItemTools', () => {
  it('executes rotate and remove actions when selection is available', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SelectedItemTools
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
    await user.click(screen.getByRole('button', { name: 'Rotate clockwise' }))
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    ).toHaveAttribute('aria-keyshortcuts', ',')
    expect(
      screen.getByRole('button', { name: 'Rotate clockwise' }),
    ).toHaveAttribute('aria-keyshortcuts', '.')
    expect(screen.getByRole('button', { name: 'Remove item' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Delete Backspace',
    )

    expect(onRotateSelection).toHaveBeenNthCalledWith(1, 1)
    expect(onRotateSelection).toHaveBeenNthCalledWith(2, -1)
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('is a single tab stop with arrow-key navigation between actions', async () => {
    const user = userEvent.setup()

    render(
      <SelectedItemTools
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
      />,
    )

    const rotateLeft = screen.getByRole('button', {
      name: 'Rotate counterclockwise',
    })
    const rotateRight = screen.getByRole('button', { name: 'Rotate clockwise' })
    const remove = screen.getByRole('button', { name: 'Remove item' })

    await user.tab()
    expect(rotateLeft).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(rotateRight).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(remove).toHaveFocus()

    // Roving tabindex: the toolbar consumes one Tab stop, so tabbing past the
    // focused item leaves the toolbar entirely rather than visiting each button.
    await user.tab()
    expect(rotateLeft).not.toHaveFocus()
    expect(rotateRight).not.toHaveFocus()
    expect(remove).not.toHaveFocus()
  })
})
