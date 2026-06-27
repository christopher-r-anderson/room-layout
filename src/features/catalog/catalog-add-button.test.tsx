// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogAddButton } from './catalog-add-button'

describe('CatalogAddButton', () => {
  it('renders the label as a stable always-visible primary action', () => {
    render(<CatalogAddButton />)

    // The label is shown outright (a named button with visible text), rather
    // than a hover-to-reveal trigger that hides its label until interaction.
    const button = screen.getByRole('button', { name: 'Add Furniture' })
    expect(within(button).getByText('Add Furniture')).toBeVisible()
  })
})
