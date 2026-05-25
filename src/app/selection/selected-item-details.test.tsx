// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectedItemDetails } from './selected-item-details'

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

describe('SelectedItemDetails', () => {
  it('does not commit rounded display values on blur when the field was not edited', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.24, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.click(xInput)
    await user.tab()

    expect(xInput).toHaveValue('1.24')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('does not commit unchanged values on Enter when the field was not edited', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.24, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.click(xInput)
    await user.keyboard('{Enter}')

    expect(xInput).toHaveValue('1.24')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('restores the committed field value when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.8')
    await user.keyboard('{Escape}')

    expect(xInput).toHaveValue('0.0')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('shows inline validation for invalid numeric drafts without committing', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.tab()

    expect(
      screen.getByText('Left/right position (m) must be a valid number.'),
    ).toBeVisible()
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('rejects malformed numeric strings instead of truncating them', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2x')
    await user.keyboard('{Enter}')

    expect(
      screen.getByText('Left/right position (m) must be a valid number.'),
    ).toBeVisible()
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('commits a field on Enter and normalizes the displayed value from the returned item', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn(() => ({
      ok: true as const,
      item: {
        ...FURNITURE_ITEM,
        position: [1.2, 0, 0] as [number, number, number],
      },
    }))

    render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2')
    await user.keyboard('{Enter}')

    expect(onUpdateSelectedItemDetails).toHaveBeenCalledWith({
      field: 'positionX',
      fieldLabel: 'Left/right position (m)',
      value: 1.2,
    })
    expect(xInput).toHaveValue('1.2')
  })

  it('re-syncs clean field values when the same selected item changes externally', () => {
    const onUpdateSelectedItemDetails = vi.fn()
    const { rerender } = render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    rerender(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.5, 0, -0.5],
          rotationY: Math.PI / 2,
        }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    expect(screen.getByLabelText('Left/right position (m)')).toHaveValue('1.5')
    expect(screen.getByLabelText('Front/back position (m)')).toHaveValue('-0.5')
    expect(screen.getByLabelText('Rotation (deg)')).toHaveValue('90')
  })

  it('does not stomp an in-progress draft when the same selected item changes externally', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()
    const { rerender } = render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.8')

    rerender(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [2.4, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    expect(xInput).toHaveValue('1.8')
  })

  it('retires optimistic committed values after props catch up and later revert', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn(() => ({
      ok: true as const,
      item: {
        ...FURNITURE_ITEM,
        position: [1.2, 0, 0] as [number, number, number],
      },
    }))
    const { rerender } = render(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Left/right position (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2')
    await user.keyboard('{Enter}')
    expect(xInput).toHaveValue('1.2')

    rerender(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.2, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )
    expect(xInput).toHaveValue('1.2')

    rerender(
      <SelectedItemDetails
        disabled={false}
        selectedFurniture={{ ...FURNITURE_ITEM }}
        consumeBlurCommitSuppression={() => false}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )
    expect(xInput).toHaveValue('0.0')
  })
})
