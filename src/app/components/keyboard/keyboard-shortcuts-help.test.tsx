// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help'

describe('KeyboardShortcutsHelp', () => {
  it('opens and dismisses keyboard shortcut guidance', async () => {
    const user = userEvent.setup()

    render(<KeyboardShortcutsHelp />)

    await user.click(
      screen.getByRole('button', { name: 'Toggle keyboard shortcuts help' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).toBeVisible()
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByText('Nudge (0.5 m)')).toBeVisible()
    expect(screen.getByText('Clear')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(
      screen.queryByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).not.toBeInTheDocument()
  })
})
