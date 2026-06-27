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

    // Shown to sighted users (not collapsed to screen-reader-only).
    expect(label.className).not.toContain('sr-only')
  })

  it('hides the visible label as screen-reader-only when displayLabel is false', () => {
    renderInToolbar(
      <ToolButton
        action={vi.fn()}
        disabled={false}
        disabledMessage="Unavailable"
        shortcuts="A"
        label="Add furniture"
        visibleLabel="Add"
        displayLabel={false}
        icon={<IconPlus />}
      />,
    )

    const button = screen.getByRole('button', { name: 'Add furniture' })
    const label = within(button).getByText('Add')

    // Still present for layout/AT, but not displayed to sighted users.
    expect(label.className).toContain('sr-only')
  })

  it('exposes the disabled reason to assistive tech and keeps the shortcut', () => {
    renderInToolbar(
      <ToolButton
        action={vi.fn()}
        disabled
        disabledMessage="No previous history"
        shortcuts="Control+Z"
        label="Undo"
        icon={<IconPlus />}
      />,
    )

    const button = screen.getByRole('button', { name: 'Undo' })

    expect(button).toHaveAttribute('aria-disabled', 'true')
    // The reason is conveyed programmatically, not just in the visual tooltip.
    expect(button).toHaveAccessibleDescription('No previous history')
    // The shortcut stays advertised; aria-disabled already qualifies it.
    expect(button).toHaveAttribute('aria-keyshortcuts', 'Control+Z')
  })

  it('does not describe an enabled button with a disabled reason', () => {
    renderInToolbar(
      <ToolButton
        action={vi.fn()}
        disabled={false}
        disabledMessage="No previous history"
        shortcuts="Control+Z"
        label="Undo"
        icon={<IconPlus />}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Undo' }),
    ).not.toHaveAccessibleDescription()
  })
})
