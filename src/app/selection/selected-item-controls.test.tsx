// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectedItemControls } from './selected-item-controls'

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

describe('SelectedItemControls', () => {
  it('does not render when there is no selection', () => {
    render(
      <SelectedItemControls
        editorInteractionsEnabled
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={null}
        startupOverlayActive={false}
      />,
    )

    expect(
      screen.queryByRole('region', { name: 'Selected item actions' }),
    ).not.toBeInTheDocument()
  })

  it('suppresses blur commits when the remove dialog is opening', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemControls
        editorInteractionsEnabled
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
        selectedFurniture={FURNITURE_ITEM}
        startupOverlayActive={false}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.4')
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('marks selected item controls inert while the startup overlay is active', () => {
    const { container } = render(
      <SelectedItemControls
        editorInteractionsEnabled
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={FURNITURE_ITEM}
        startupOverlayActive
      />,
    )

    expect(container.firstChild).toHaveAttribute('inert', '')
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(
      screen.getByRole('button', {
        name: 'Rotate counterclockwise',
        hidden: true,
      }),
    ).toHaveAttribute('aria-disabled', 'true')
  })
})
