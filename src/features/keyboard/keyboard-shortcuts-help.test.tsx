// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  KeyboardShortcutsDialog,
  KeyboardShortcutsHelp,
} from './keyboard-shortcuts-help'

function mockNavigatorPlatform(platform: string, userAgent: string) {
  const platformSpy = vi
    .spyOn(window.navigator, 'platform', 'get')
    .mockReturnValue(platform)
  const userAgentSpy = vi
    .spyOn(window.navigator, 'userAgent', 'get')
    .mockReturnValue(userAgent)

  return () => {
    platformSpy.mockRestore()
    userAgentSpy.mockRestore()
  }
}

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
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBeGreaterThan(1)
    expect(screen.getByText('Navigation')).toBeVisible()
    expect(screen.getByText('Focus inspector')).toBeVisible()
    expect(screen.getByText('Focus room view')).toBeVisible()
    expect(screen.getByText('Focus Furniture in room')).toBeVisible()
    expect(screen.getByText('Scene/Global')).toBeVisible()
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

  it('renders compact alternatives and Apple-specific modifier labels', () => {
    const restoreNavigator = mockNavigatorPlatform(
      'MacIntel',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    )

    try {
      render(
        <KeyboardShortcutsDialog
          open
          onOpenChange={() => undefined}
          triggerButton={null}
        />,
      )

      const panCameraRow = screen.getByText('Pan camera').closest('tr')

      expect(panCameraRow).not.toBeNull()

      if (!panCameraRow) {
        throw new Error('Pan camera row was not rendered')
      }

      expect(within(panCameraRow).getAllByText('Shift').length).toBe(1)
      expect(within(panCameraRow).getAllByText('/').length).toBe(3)
      expect(within(panCameraRow).getByText('W')).toBeVisible()
      expect(within(panCameraRow).getByText('A')).toBeVisible()
      expect(within(panCameraRow).getByText('S')).toBeVisible()
      expect(within(panCameraRow).getByText('D')).toBeVisible()
      expect(screen.getAllByText('Cmd').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Opt').length).toBeGreaterThan(0)
      expect(screen.queryByText('Ctrl')).not.toBeInTheDocument()
      expect(screen.queryByText('Alt')).not.toBeInTheDocument()
    } finally {
      restoreNavigator()
    }
  })
})
