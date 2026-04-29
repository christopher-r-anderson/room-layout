// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FurnitureOutliner } from './furniture-outliner'

describe('FurnitureOutliner', () => {
  it('renders empty state when no items exist', () => {
    render(
      <FurnitureOutliner descriptionId="desc" items={[]} onSelect={vi.fn()} />,
    )

    expect(screen.getByText('No furniture in room yet.')).toBeInTheDocument()
  })

  it('renders one button per item and marks selected state', () => {
    render(
      <FurnitureOutliner
        descriptionId="desc"
        onSelect={vi.fn()}
        items={[
          { id: 'item-1', label: 'Leather Couch', selected: false },
          { id: 'item-2', label: 'End Table', selected: true },
        ]}
      />,
    )

    expect(screen.getAllByRole('button')).toHaveLength(2)
    const selectedButton = screen.getByRole('button', {
      name: 'End Table — selected',
    })
    expect(selectedButton).toHaveAttribute('aria-current', 'true')
  })

  it('supports native click and keyboard activation', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <FurnitureOutliner
        descriptionId="desc"
        onSelect={onSelect}
        items={[{ id: 'item-1', label: 'Leather Couch', selected: false }]}
      />,
    )

    const itemButton = screen.getByRole('button', { name: 'Leather Couch' })
    await user.click(itemButton)
    expect(onSelect).toHaveBeenNthCalledWith(1, 'item-1')

    itemButton.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(3)
  })

  it('keeps focus on the outliner button after selection', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <FurnitureOutliner
        descriptionId="desc"
        onSelect={onSelect}
        items={[{ id: 'item-1', label: 'Leather Couch', selected: false }]}
      />,
    )

    const itemButton = screen.getByRole('button', { name: 'Leather Couch' })
    await user.click(itemButton)

    expect(itemButton).toHaveFocus()
  })
})
