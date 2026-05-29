// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { RoomControls } from './room-controls'

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
    {
      id: 'light-gray',
      label: 'Light Gray',
      color: 0xf5f5f5,
    },
    {
      id: 'warm-white',
      label: 'Warm White',
      color: 0xf7f3ea,
    },
  ]
}

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
