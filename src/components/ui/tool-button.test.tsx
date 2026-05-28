// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { IconPlus } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { ToolButton } from './tool-button'

describe('ToolButton', () => {
  it('keeps the existing responsive label behavior by default', () => {
    render(
      <ToolButton
        action={vi.fn()}
        disabled={false}
        disabledMessage="Unavailable"
        shortcuts="A"
        label="Add furniture"
        visibleLabel="Add"
        icon={<IconPlus />}
      />,
    )

    const button = screen.getByRole('button', { name: 'Add furniture' })
    const label = within(button).getByText('Add')

    expect(label.className).toContain('sr-only')
    expect(label.className).toContain('sm:not-sr-only')
  })

  it('supports explicit label visibility and toolbar sizing for future header layouts', () => {
    render(
      <ToolButton
        action={vi.fn()}
        disabled={false}
        disabledMessage="Unavailable"
        shortcuts="A"
        label="Add furniture"
        visibleLabel="Add furniture"
        labelVisibility="always"
        size="toolbar"
        icon={<IconPlus />}
      />,
    )

    const button = screen.getByRole('button', { name: 'Add furniture' })
    const label = within(button).getByText('Add furniture')

    expect(label.className).not.toContain('sr-only')
    expect(button.className).toContain('h-9')
  })
})
