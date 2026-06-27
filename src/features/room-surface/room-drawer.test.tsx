// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import { createFloorOptions, createWallOptions } from './test-fixtures'

describe('RoomDrawer', () => {
  it('restores focus through the provided close callback', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = React.useState(false)
      const triggerRef = React.useRef<HTMLButtonElement | null>(null)

      return (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Open room
          </button>
          <RoomDrawer
            open={open}
            onOpenChange={setOpen}
            onCloseAutoFocus={() => {
              triggerRef.current?.focus()
            }}
            floorFinishId="wood-floor"
            floorFinishLoading={false}
            floorFinishes={createFloorOptions()}
            onFloorFinishChange={vi.fn()}
            wallFinishId="light-gray"
            wallFinishes={createWallOptions()}
            onWallFinishChange={vi.fn()}
          />
        </>
      )
    }

    render(<TestHarness />)

    const trigger = screen.getByRole('button', { name: 'Open room' })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: 'Room' })).toBeVisible()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Room' })).toHaveAttribute(
        'data-state',
        'closed',
      )
    })

    expect(trigger).toHaveFocus()
  })

  it('suppresses trigger focus restoration when restoreFocusOnClose is false', async () => {
    const user = userEvent.setup()
    const onCloseAutoFocus = vi.fn()

    function TestHarness() {
      const [open, setOpen] = React.useState(false)

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Open room
          </button>
          <RoomDrawer
            open={open}
            onOpenChange={setOpen}
            onCloseAutoFocus={onCloseAutoFocus}
            restoreFocusOnClose={false}
            floorFinishId="wood-floor"
            floorFinishLoading={false}
            floorFinishes={createFloorOptions()}
            onFloorFinishChange={vi.fn()}
            wallFinishId="light-gray"
            wallFinishes={createWallOptions()}
            onWallFinishChange={vi.fn()}
          />
        </>
      )
    }

    render(<TestHarness />)

    await user.click(screen.getByRole('button', { name: 'Open room' }))
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Room' })).toHaveAttribute(
        'data-state',
        'closed',
      )
    })

    expect(onCloseAutoFocus).not.toHaveBeenCalled()
  })

  it('forwards room control changes through the shared controls surface', () => {
    const onFloorFinishChange = vi.fn()
    const onWallFinishChange = vi.fn()

    render(
      <RoomDrawer
        open={true}
        onOpenChange={vi.fn()}
        floorFinishId="wood-floor"
        floorFinishLoading={true}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={onWallFinishChange}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))

    expect(screen.getByRole('tabpanel', { name: 'Floor' })).toHaveAttribute(
      'aria-busy',
      'true',
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Concrete' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Walls' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Warm White' }))

    expect(onFloorFinishChange).toHaveBeenCalledWith('concrete-floor')
    expect(onWallFinishChange).toHaveBeenCalledWith('warm-white')
  })
})
