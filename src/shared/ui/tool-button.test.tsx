// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { IconPlus } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { Toolbar } from '@base-ui/react/toolbar'
import { ToolButton } from './tool-button'

// ToolButton is a Toolbar.Button, so it only mounts inside a Toolbar.Root.
function renderInToolbar(ui: React.ReactElement) {
  return render(<Toolbar.Root>{ui}</Toolbar.Root>)
}

describe('ToolButton', () => {
  it('shows the label by default', () => {
    renderInToolbar(
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

    expect(label.className).toBe('')
  })

  it('supports explicit label visibility and toolbar sizing for future header layouts', () => {
    renderInToolbar(
      <ToolButton
        action={vi.fn()}
        disabled={false}
        disabledMessage="Unavailable"
        shortcuts="A"
        label="Add furniture"
        visibleLabel="Add furniture"
        displayLabel={true}
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
