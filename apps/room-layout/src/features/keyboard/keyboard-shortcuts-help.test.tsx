// @vitest-environment jsdom

import { flushMicrotasks, render, screen, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-help'

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

describe('KeyboardShortcutsDialog', () => {
  it('shows the full shortcut guidance and dismisses', async () => {
    const user = userEvent.setup()

    // The dialog owns no trigger; an external control opens it (as the header
    // does via the dialog store).
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
            Open shortcuts
          </button>
          <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
        </>
      )
    }

    render(<TestHarness />)

    await user.click(screen.getByRole('button', { name: 'Open shortcuts' }))

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })

    expect(dialog).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Keyboard Shortcuts' }),
    ).toBeVisible()
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBeGreaterThan(1)
    // Assert the section structure and one representative row per section rather
    // than every label (those mirror the shortcut definitions and would churn on
    // any copy change).
    expect(screen.getByText('Navigation')).toBeVisible()
    expect(screen.getByText('Focus inspector')).toBeVisible()
    expect(screen.getByText('Scene/Global')).toBeVisible()
    expect(screen.getByText('Clear selection')).toBeVisible()
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

  it('renders compact alternatives and Apple-specific modifier labels', async () => {
    const restoreNavigator = mockNavigatorPlatform(
      'MacIntel',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    )

    try {
      render(<KeyboardShortcutsDialog open onOpenChange={() => undefined} />)
      // Flush the scroll area's deferred mount measurement so its state update
      // commits inside act instead of after the test.
      await flushMicrotasks()

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
