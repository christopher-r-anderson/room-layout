// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectionToolsOther } from './selection-tools-other'

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

describe('SelectionToolsOther', () => {
  it('executes rotate, and delete actions when selection is available', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SelectionToolsOther
        editorInteractionsEnabled
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
        selectedFurniture={FURNITURE_ITEM}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Rotate Left' }))
    await user.click(screen.getByRole('button', { name: 'Rotate Right' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onRotateSelection).toHaveBeenNthCalledWith(1, 1)
    expect(onRotateSelection).toHaveBeenNthCalledWith(2, -1)
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('keeps actions focusable but non-interactive when disabled', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    const onOpenDeleteDialog = vi.fn()

    render(
      <SelectionToolsOther
        editorInteractionsEnabled={false}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={onRotateSelection}
        selectedFurniture={null}
      />,
    )

    const rotateRight = screen.getByRole('button', { name: 'Rotate Right' })
    expect(rotateRight).toHaveAttribute('aria-disabled', 'true')

    await user.click(screen.getByRole('button', { name: 'Rotate Left' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onRotateSelection).not.toHaveBeenCalled()
    expect(onOpenDeleteDialog).not.toHaveBeenCalled()
  })
})
