// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionToolsOther } from './selection-tools-other'
import { FURNITURE_ITEM } from './test-fixtures'

describe('SelectionToolsOther', () => {
  it('executes rotate and remove actions when selection is available', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SelectionToolsOther
        editorInteractionsEnabled
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
        selectedFurniture={FURNITURE_ITEM}
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
      <SelectionToolsOther
        editorInteractionsEnabled={false}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
        selectedFurniture={null}
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
