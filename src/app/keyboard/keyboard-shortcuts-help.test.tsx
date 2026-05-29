// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  KeyboardShortcutsDialog,
  KeyboardShortcutsHelp,
} from './keyboard-shortcuts-help'

describe('KeyboardShortcutsHelp', () => {
  it('opens and dismisses keyboard shortcut guidance', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = useState(false)
      return <KeyboardShortcutsHelp open={open} onOpenChange={setOpen} />
    }

    render(<TestHarness />)

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
    expect(screen.getByText('Start Over')).toBeVisible()
    expect(
      screen.getByText(
        /Most shortcuts below work only while the 3D room view is focused/i,
      ),
    ).toBeVisible()
    expect(
      screen.getByText(
        /Use the header controls for Add Furniture and Room, then open More on mobile/i,
      ),
    ).toBeVisible()

    await user.click(
      within(dialog).getAllByRole('button', { name: 'Close' })[0],
    )

    expect(
      screen.queryByRole('dialog', { name: 'Keyboard Shortcuts' }),
    ).not.toBeInTheDocument()
  })

  it('can be launched without rendering its built-in trigger', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = useState(false)

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Open from more
          </button>
          <KeyboardShortcutsDialog
            open={open}
            onOpenChange={setOpen}
            triggerButton={null}
          />
        </>
      )
    }

    render(<TestHarness />)

    expect(
      screen.queryByRole('button', { name: 'Keyboard shortcuts' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open from more' }))

    expect(
      screen.getByRole('dialog', { name: 'Keyboard Shortcuts' }),
    ).toBeVisible()
  })
})
