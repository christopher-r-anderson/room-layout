// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogAddButton } from './catalog-add-button'

describe('CatalogAddButton', () => {
  it('renders as a stable primary action instead of a hover-expanding trigger', () => {
    render(<CatalogAddButton />)

    const button = screen.getByRole('button', { name: 'Add Furniture' })

    expect(screen.getByText('Add Furniture')).toBeInTheDocument()
    expect(button.className).not.toContain('hover:w-42')
    expect(button.className).not.toContain('focus-visible:w-42')
    expect(button.className).not.toContain('rounded-full')
    expect(button.className).toContain('rounded-lg')
  })
})
