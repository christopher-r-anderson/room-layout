// @vitest-environment jsdom

import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectedDetailsView } from './selected-details-view'
import { FURNITURE_ITEM } from '@/test/support/furniture'

describe('SelectedDetailsView', () => {
  it('tabs through the position fields, then the rotation input', async () => {
    const user = userEvent.setup()

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    await user.tab()
    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('Distance from back wall (m)')).toHaveFocus()

    await user.tab()
    expect(screen.getByLabelText('Rotation (deg)')).toHaveFocus()
  })

  it('does not commit rounded display values on blur when the field was not edited', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.24, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.click(xInput)
    await user.tab()

    expect(xInput).toHaveValue('3.14')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('does not commit unchanged values on Enter when the field was not edited', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.24, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.click(xInput)
    await user.keyboard('{Enter}')

    expect(xInput).toHaveValue('3.14')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('restores the committed field value when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.8')
    await user.keyboard('{Escape}')

    expect(xInput).toHaveValue('1.9')
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('shows inline validation for invalid numeric drafts without committing', async () => {
    const user = userEvent.setup()
    const onInvalidSelectedItemDetailValue = vi.fn(
      (fieldLabel: string) => `${fieldLabel} must be a valid number.`,
    )
    const onUpdateSelectedItemDetails = vi.fn()

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.tab()

    expect(
      screen.getAllByText(
        'Distance from left wall (m) must be a valid number.',
      )[0],
    ).toBeVisible()
    expect(onInvalidSelectedItemDetailValue).toHaveBeenCalledWith(
      'Distance from left wall (m)',
    )
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('shows keyboard help visually on focus without exposing it as an alert', async () => {
    const user = userEvent.setup()

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    await user.click(screen.getByLabelText('Rotation (deg)'))

    const visualSupportMessage = screen
      .getAllByText('Tab / Enter applies rotation. Esc cancels.')
      .find((element) => element.getAttribute('aria-hidden') === 'true')

    expect(visualSupportMessage).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces validation failures as an alert separate from the visual support row', async () => {
    const user = userEvent.setup()
    const onInvalidSelectedItemDetailValue = vi.fn(
      (fieldLabel: string) => `${fieldLabel} must be a valid number.`,
    )

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.keyboard('{Enter}')

    const liveErrorMessage = document.querySelector('[aria-live="assertive"]')

    expect(
      screen.getAllByText(
        'Distance from left wall (m) must be a valid number.',
      )[0],
    ).toBeVisible()
    expect(liveErrorMessage).toHaveTextContent(
      'Distance from left wall (m) must be a valid number.',
    )
  })

  it('rejects malformed numeric strings instead of truncating them', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()
    const onInvalidSelectedItemDetailValue = vi.fn(
      (fieldLabel: string) => `${fieldLabel} must be a valid number.`,
    )

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2x')
    await user.keyboard('{Enter}')

    expect(
      screen.getAllByText(
        'Distance from left wall (m) must be a valid number.',
      )[0],
    ).toBeVisible()
    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
  })

  it('commits a field on Enter and normalizes the displayed value from the returned item', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn(() => ({
      ok: true as const,
      item: {
        ...FURNITURE_ITEM,
        position: [-0.7, 0, 0] as [number, number, number],
      },
    }))

    render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2')
    await user.keyboard('{Enter}')

    expect(onUpdateSelectedItemDetails).toHaveBeenCalledWith({
      field: 'positionX',
      fieldLabel: 'Distance from left wall (m)',
      value: 1.2,
    })
    expect(xInput).toHaveValue('1.2')
  })

  it('re-syncs clean field values when the same selected item changes externally', () => {
    const onUpdateSelectedItemDetails = vi.fn()
    const { rerender } = render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    rerender(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [1.5, 0, -0.5],
          rotationY: Math.PI / 2,
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveValue(
      '4.025',
    )
    expect(screen.getByLabelText('Distance from back wall (m)')).toHaveValue(
      '1.4',
    )
    expect(screen.getByLabelText('Rotation (deg)')).toHaveValue('270')
  })

  it('shows 0.0 instead of -0.0 for near-wall floating-point clearances', () => {
    render(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [-1.9004, 0, -2.5254],
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveValue(
      '0.0',
    )
    expect(screen.getByLabelText('Distance from back wall (m)')).toHaveValue(
      '0.0',
    )
  })

  it('shows clockwise-positive display values for negative scene rotation', () => {
    render(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          rotationY: -Math.PI / 12,
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Rotation (deg)')).toHaveValue('15')
  })

  it('normalizes epsilon clockwise rotations back to 0 instead of 360', () => {
    render(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          rotationY: 1.7e-15,
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Rotation (deg)')).toHaveValue('0')
  })

  it('does not stomp an in-progress draft when the same selected item changes externally', async () => {
    const user = userEvent.setup()
    const onUpdateSelectedItemDetails = vi.fn()
    const { rerender } = render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.8')

    rerender(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [2.4, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
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
        position: [-0.7, 0, 0] as [number, number, number],
      },
    }))
    const { rerender } = render(
      <SelectedDetailsView
        selectedFurniture={FURNITURE_ITEM}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.2')
    await user.keyboard('{Enter}')
    expect(xInput).toHaveValue('1.2')

    rerender(
      <SelectedDetailsView
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [-0.7, 0, 0],
        }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )
    expect(xInput).toHaveValue('1.2')

    rerender(
      <SelectedDetailsView
        selectedFurniture={{ ...FURNITURE_ITEM }}
        consumeBlurCommitSuppression={() => false}
        onInvalidSelectedItemDetailValue={vi.fn()}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />,
    )
    expect(xInput).toHaveValue('1.9')
  })
})
