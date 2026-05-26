// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help'

describe('KeyboardShortcutsHelp', () => {
  it('opens and dismisses keyboard shortcut guidance', async () => {
    const user = userEvent.setup()

    render(<KeyboardShortcutsHelp />)

    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })

    expect(dialog).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).toBeVisible()
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByText('Preview next item')).toBeVisible()
    expect(screen.getByText('Select previewed item')).toBeVisible()
    expect(screen.getByText('Nudge selected item (0.5 m)')).toBeVisible()
    expect(screen.getByText('Clear selection')).toBeVisible()
    expect(screen.getByText('New Scene')).toBeVisible()
    expect(
      screen.getByText(
        /Most shortcuts below work only while the 3D room view is focused/i,
      ),
    ).toBeVisible()

    await user.click(
      within(dialog).getAllByRole('button', { name: 'Close' })[0],
    )

    expect(
      screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' }),
    ).not.toBeInTheDocument()
  })
})
