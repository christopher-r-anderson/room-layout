// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { SelectedActionsView } from './selected-actions-view'
import { FURNITURE_ITEM } from './test-fixtures'

function renderActions(
  overrides: Partial<React.ComponentProps<typeof SelectedActionsView>> = {},
) {
  const props: React.ComponentProps<typeof SelectedActionsView> = {
    disabled: false,
    selectedFurniture: FURNITURE_ITEM,
    onOpenDeleteDialog: vi.fn(),
    onPrepareDelete: vi.fn(),
    onRotateSelection: vi.fn(),
    placementMode: 'floating',
    ...overrides,
  }

  render(
    <TooltipProvider>
      <SelectedActionsView {...props} />
    </TooltipProvider>,
  )

  return props
}

describe('SelectedActionsView', () => {
  it('renders rotate and remove controls labelled for the actions section', () => {
    renderActions()

    expect(
      screen.getByRole('region', { name: 'Selected item actions' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Rotate clockwise' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('invokes the rotate callback when the rotate buttons are clicked', async () => {
    const user = userEvent.setup()
    const onRotateSelection = vi.fn()
    renderActions({ onRotateSelection })

    await user.click(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
    await user.click(screen.getByRole('button', { name: 'Rotate clockwise' }))

    expect(onRotateSelection).toHaveBeenCalledTimes(2)
    const directions = onRotateSelection.mock.calls.map(
      (call) => call[0] as number,
    )
    expect(new Set(directions)).toEqual(new Set([-1, 1]))
  })

  it('invokes the open-delete callback on remove click and the prepare callback on pointer down', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()
    const onPrepareDelete = vi.fn()
    renderActions({ onOpenDeleteDialog, onPrepareDelete })

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.pointer([
      { keys: '[MouseLeft>]', target: removeButton },
      { keys: '[/MouseLeft]', target: removeButton },
    ])
    expect(onPrepareDelete).toHaveBeenCalled()
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('marks interactive controls aria-disabled when disabled is true', () => {
    renderActions({ disabled: true })

    expect(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Rotate clockwise' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: /remove/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('propagates placementMode and placementCandidateId to data attributes', () => {
    renderActions({
      placementMode: 'docked',
      placementCandidateId: 'top-center',
    })

    const section = screen.getByRole('region', {
      name: 'Selected item actions',
    })
    expect(section).toHaveAttribute('data-selected-toolbar-mode', 'docked')
    expect(section).toHaveAttribute(
      'data-selected-toolbar-candidate',
      'top-center',
    )
  })

  it('omits the toolbar-mode data attribute when placementMode is not provided', () => {
    renderActions({ placementMode: undefined })

    const section = screen.getByRole('region', {
      name: 'Selected item actions',
    })
    expect(section).not.toHaveAttribute('data-selected-toolbar-mode')
  })
})
