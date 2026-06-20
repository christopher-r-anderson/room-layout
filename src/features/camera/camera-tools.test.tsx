// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { CommandDispatchProvider } from '@/editor-state/command-dispatch-provider'
import type { CommandDispatch } from '@/editor-state/command-dispatch-context'
import { CameraTools } from './camera-tools'

function renderWithDispatch(ui: ReactElement, dispatch: CommandDispatch) {
  return render(
    <CommandDispatchProvider value={dispatch}>{ui}</CommandDispatchProvider>,
  )
}

describe('CameraTools', () => {
  it('uses explicit props without relying on store state', () => {
    renderWithDispatch(
      <CameraTools editorInteractionsEnabled={true} hasSelection={true} />,
      vi.fn(),
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Focus Selected' })).toBeEnabled()
  })

  it('dispatches camera preset and focus-selected commands on click', async () => {
    const user = userEvent.setup()
    const dispatch: CommandDispatch = vi.fn()

    renderWithDispatch(
      <CameraTools editorInteractionsEnabled={true} hasSelection={true} />,
      dispatch,
    )

    await user.click(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Switch to Front view' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Switch to Side view' }),
    )
    await user.click(screen.getByRole('button', { name: 'Switch to Top view' }))
    await user.click(screen.getByRole('button', { name: 'Focus Selected' }))

    expect(vi.mocked(dispatch).mock.calls.map(([command]) => command)).toEqual([
      { kind: 'set-camera-preset', preset: 'corner' },
      { kind: 'set-camera-preset', preset: 'front' },
      { kind: 'set-camera-preset', preset: 'side' },
      { kind: 'set-camera-preset', preset: 'top' },
      { kind: 'focus-selected' },
    ])
  })

  it('respects disabled state from explicit props', () => {
    const dispatch: CommandDispatch = vi.fn()

    const { rerender } = renderWithDispatch(
      <CameraTools editorInteractionsEnabled={false} hasSelection={false} />,
      dispatch,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).toHaveAttribute('aria-disabled', 'true')

    rerender(
      <CommandDispatchProvider value={dispatch}>
        <CameraTools editorInteractionsEnabled={true} hasSelection={true} />
      </CommandDispatchProvider>,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })
})
