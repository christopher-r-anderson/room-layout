// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { IconPlus } from '@tabler/icons-react'
import { describe, expect, it, vi } from 'vitest'
import { Toolbar } from '@base-ui/react/toolbar'
import { ToolbarCommandButton, ToolbarPopupButton } from './toolbar-button'
import type { ReactElement } from 'react'

// Both components are Toolbar.Buttons, so they only mount inside a Toolbar.Root.
function renderInToolbar(ui: ReactElement) {
  return render(<Toolbar.Root>{ui}</Toolbar.Root>)
}

describe('ToolbarCommandButton', () => {
  it('shows the label by default', () => {
    renderInToolbar(
      <ToolbarCommandButton
        onClick={vi.fn()}
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

  it('hides the visible label as screen-reader-only when showLabel is false', () => {
    renderInToolbar(
      <ToolbarCommandButton
        onClick={vi.fn()}
        disabled={false}
        disabledMessage="Unavailable"
        shortcuts="A"
        label="Add furniture"
        visibleLabel="Add"
        showLabel={false}
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
      <ToolbarCommandButton
        onClick={vi.fn()}
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
      <ToolbarCommandButton
        onClick={vi.fn()}
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

describe('ToolbarPopupButton', () => {
  it('carries the popup wiring for a dialog trigger', () => {
    renderInToolbar(
      <ToolbarPopupButton
        onClick={vi.fn()}
        controlsId="keyboard-shortcuts-dialog"
        expanded={false}
        popupType="dialog"
        label="Keyboard shortcuts"
        showLabel={false}
        icon={<IconPlus />}
        tooltip="Keyboard shortcuts"
      />,
    )

    const button = screen.getByRole('button', { name: 'Keyboard shortcuts' })

    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button).toHaveAttribute('aria-controls', 'keyboard-shortcuts-dialog')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('reflects the open surface through aria-expanded', () => {
    renderInToolbar(
      <ToolbarPopupButton
        onClick={vi.fn()}
        controlsId="room-surface"
        expanded
        label="Room"
        icon={<IconPlus />}
        tooltip="Adjust wall, floor, and lighting"
      />,
    )

    expect(screen.getByRole('button', { name: 'Room' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('omits aria-haspopup for inline surfaces', () => {
    renderInToolbar(
      <ToolbarPopupButton
        onClick={vi.fn()}
        controlsId="room-surface"
        expanded={false}
        label="Room"
        icon={<IconPlus />}
        tooltip="Adjust wall, floor, and lighting"
      />,
    )

    expect(screen.getByRole('button', { name: 'Room' })).not.toHaveAttribute(
      'aria-haspopup',
    )
  })
})
