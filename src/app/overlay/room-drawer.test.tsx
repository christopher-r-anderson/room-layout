// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { RoomDrawer } from './room-drawer'

function createFloorOptions(): FloorFinishOption[] {
  return [
    {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/textures/wood.jpg',
      normalPath: '/textures/wood-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
    {
      id: 'concrete-floor',
      label: 'Concrete',
      diffusePath: '/textures/concrete.jpg',
      normalPath: '/textures/concrete-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
  ]
}

function createWallOptions(): WallFinishOption[] {
  return [
    { id: 'light-gray', label: 'Light Gray', color: 0xf5f5f5 },
    { id: 'warm-white', label: 'Warm White', color: 0xf7f3ea },
  ]
}

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
