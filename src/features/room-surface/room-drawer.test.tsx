// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@/test/render'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { createEnvironmentConfig } from './test-fixtures'

beforeEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
})

afterEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
})

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

  it('mounts the connected room controls in the drawer surface', () => {
    assetsActions.setAssets({
      catalog: [],
      collections: [],
      environmentConfig: createEnvironmentConfig(),
    })
    sceneDocumentActions.setFloorFinishId('wood-floor')
    sceneDocumentActions.setWallFinishId('light-gray')
    sceneDocumentActions.setFloorFinishLoading(true)

    render(<RoomDrawer open={true} onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))

    expect(screen.getByRole('tabpanel', { name: 'Floor' })).toHaveAttribute(
      'aria-busy',
      'true',
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Concrete' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Walls' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Warm White' }))

    expect(sceneDocumentStore.getState().floorFinishId).toBe('concrete-floor')
    expect(sceneDocumentStore.getState().wallFinishId).toBe('warm-white')
  })
})
