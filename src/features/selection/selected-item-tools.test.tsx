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
        controlsDisabled={false}
        disabledMessage=""
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

  it('keeps actions focusable but non-interactive when disabled', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SelectedItemTools
        controlsDisabled={true}
        disabledMessage="Editor interactions are unavailable while loading"
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
      />,
    )

    const rotateRight = screen.getByRole('button', {
      name: 'Rotate clockwise',
    })
    expect(rotateRight).toHaveAttribute('aria-disabled', 'true')

    await user.click(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(onRotateSelection).not.toHaveBeenCalled()
    expect(onOpenDeleteDialog).not.toHaveBeenCalled()
  })
})
