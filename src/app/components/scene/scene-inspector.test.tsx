// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { MoveSelectionResult } from '@/scene/scene.types'
import { SceneInspector } from './scene-inspector'

const FURNITURE_ITEM: FurnitureItem = {
  id: 'item-1',
  catalogId: 'couch-1',
  name: 'Leather Couch',
  kind: 'couch',
  collectionId: 'leather-collection',
  nodeName: 'couch',
  sourcePath: '/models/leather-collection.glb',
  footprintSize: {
    width: 2.2,
    depth: 0.95,
  },
  position: [0, 0, 0],
  rotationY: 0,
}

describe('SceneInspector', () => {
  it('shows an empty hint when no furniture is selected', () => {
    const onMoveSelection = vi.fn<
      (delta: { x: number; z: number }) => MoveSelectionResult
    >(() => ({
      ok: false,
      reason: 'no-selection',
    }))

    render(
      <SceneInspector
        disabled={false}
        onMoveSelection={onMoveSelection}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        selectedFurniture={null}
      />,
    )

    expect(
      screen.getByText(/select an item from the list or canvas to edit it/i),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Move right' })).toBeDisabled()
  })

  it('routes inspector actions through the provided handlers', async () => {
    const user = userEvent.setup()
    const onMoveSelection = vi.fn(() => ({
      ok: true as const,
      position: [0.5, 0, 0] as [number, number, number],
    }))
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SceneInspector
        disabled={false}
        onMoveSelection={onMoveSelection}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
        selectedFurniture={FURNITURE_ITEM}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Move right' }))
    await user.click(
      screen.getByRole('button', { name: 'Rotate selected left' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove selected item' }),
    )

    expect(onMoveSelection).toHaveBeenCalledWith(
      { x: 0.5, z: 0 },
      { source: 'inspector' },
    )
    expect(onRotateSelection).toHaveBeenCalledWith(1)
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })
})
