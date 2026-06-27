// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RoomControls } from '@/features/room-surface/room-controls'
import { createFloorOptions, createWallOptions } from './test-fixtures'

describe('RoomControls', () => {
  it('marks floor finish control as busy while floor textures are loading', () => {
    render(
      <RoomControls
        floorFinishId="wood-floor"
        floorFinishLoading={true}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={vi.fn()}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))

    expect(screen.getByRole('tabpanel', { name: 'Floor' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('forwards select changes to floor and wall handlers', () => {
    const onFloorFinishChange = vi.fn()
    const onWallFinishChange = vi.fn()

    render(
      <RoomControls
        floorFinishId="wood-floor"
        floorFinishLoading={false}
        floorFinishes={createFloorOptions()}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId="light-gray"
        wallFinishes={createWallOptions()}
        onWallFinishChange={onWallFinishChange}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Warm White' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Concrete' }))

    expect(onFloorFinishChange).toHaveBeenCalledWith('concrete-floor')
    expect(onWallFinishChange).toHaveBeenCalledWith('warm-white')
  })
})
