// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { MoveSelectionResult } from '@/scene/scene.types'
import { SelectionToolsMovement } from './selection-tools-movement'

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

describe('SelectionToolsMovement', () => {
  it('executes move actions when selection is available', async () => {
    const user = userEvent.setup()
    const onMoveSelection = vi.fn<
      (
        delta: { x: number; z: number },
        options?: { source?: 'keyboard' | 'inspector' | 'toolbar' | 'drag' },
      ) => MoveSelectionResult
    >(() => ({ ok: true, position: [0, 0, 0] }))

    render(
      <SelectionToolsMovement
        editorInteractionsEnabled
        onMoveSelection={onMoveSelection}
        selectedFurniture={FURNITURE_ITEM}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Move Up' }))
    await user.click(screen.getByRole('button', { name: 'Move Down' }))
    await user.click(screen.getByRole('button', { name: 'Move Left' }))
    await user.click(screen.getByRole('button', { name: 'Move Right' }))

    expect(screen.getByRole('button', { name: 'Move Up' })).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowUp Shift+ArrowUp Alt+ArrowUp',
    )
    expect(screen.getByRole('button', { name: 'Move Right' })).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowRight Shift+ArrowRight Alt+ArrowRight',
    )

    expect(onMoveSelection).toHaveBeenNthCalledWith(
      1,
      { x: 0, z: -0.5 },
      { source: 'toolbar' },
    )
    expect(onMoveSelection).toHaveBeenNthCalledWith(
      2,
      { x: 0, z: 0.5 },
      { source: 'toolbar' },
    )
    expect(onMoveSelection).toHaveBeenNthCalledWith(
      3,
      { x: -0.5, z: 0 },
      { source: 'toolbar' },
    )
    expect(onMoveSelection).toHaveBeenNthCalledWith(
      4,
      { x: 0.5, z: 0 },
      { source: 'toolbar' },
    )
  })

  it('keeps actions focusable but non-interactive when disabled', async () => {
    const user = userEvent.setup()
    const onMoveSelection = vi.fn<
      (
        delta: { x: number; z: number },
        options?: { source?: 'keyboard' | 'inspector' | 'toolbar' | 'drag' },
      ) => MoveSelectionResult
    >(() => ({ ok: true, position: [0, 0, 0] }))

    render(
      <SelectionToolsMovement
        editorInteractionsEnabled={false}
        onMoveSelection={onMoveSelection}
        selectedFurniture={null}
      />,
    )

    const moveUp = screen.getByRole('button', { name: 'Move Up' })
    expect(moveUp).toHaveAttribute('aria-disabled', 'true')

    await user.click(moveUp)

    expect(onMoveSelection).not.toHaveBeenCalled()
  })
})
