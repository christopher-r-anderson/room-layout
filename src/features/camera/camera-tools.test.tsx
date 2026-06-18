// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CameraTools } from './camera-tools'

describe('CameraTools', () => {
  it('uses explicit props without relying on store state', () => {
    render(
      <CameraTools
        editorInteractionsEnabled={true}
        hasSelection={true}
        onSetPreset={vi.fn()}
        onFocusSelected={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Focus Selected' })).toBeEnabled()
  })

  it('respects disabled state from explicit props', () => {
    const onSetPreset = vi.fn()
    const onFocusSelected = vi.fn()

    const { rerender } = render(
      <CameraTools
        editorInteractionsEnabled={false}
        hasSelection={false}
        onSetPreset={onSetPreset}
        onFocusSelected={onFocusSelected}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).toHaveAttribute('aria-disabled', 'true')

    rerender(
      <CameraTools
        editorInteractionsEnabled={true}
        hasSelection={true}
        onSetPreset={onSetPreset}
        onFocusSelected={onFocusSelected}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })
})
