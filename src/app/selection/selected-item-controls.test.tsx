// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
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

const OTHER_FURNITURE_ITEM: FurnitureItem = {
  ...FURNITURE_ITEM,
  id: 'item-2',
  name: 'Lounge Chair',
}

function createRect(width: number, height: number): DOMRectReadOnly {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }
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

  it('renders the selected item actions card when an item is active', () => {
    render(
      <SelectedItemControls
        editorInteractionsEnabled
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={FURNITURE_ITEM}
        startupOverlayActive={false}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Selected item actions' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove item' })).toBeVisible()
  })

  it('marks the toolbar as floating when scene geometry is available', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'render-bounds',
          canvasSize: { width: 800, height: 600 },
          points: [
            { x: 360, y: 280 },
            { x: 440, y: 280 },
            { x: 360, y: 340 },
            { x: 440, y: 340 },
          ],
        }}
        startupOverlayActive={false}
      />,
    )

    const toolbar = screen.getByRole('region', {
      name: 'Selected item actions',
    })
    expect(toolbar).toHaveAttribute('data-selected-toolbar-mode', 'floating')
    expect(toolbar).toHaveAttribute('data-selected-toolbar-side', 'top')

    vi.unstubAllGlobals()
  })

  it('measures the actions toolbar after a selection appears', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    vi.stubGlobal('ResizeObserver', undefined)
    const getBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function getMeasuredRect(this: HTMLElement) {
        return this.getAttribute('aria-label') === 'Selected item actions'
          ? createRect(164, 52)
          : createRect(0, 0)
      })

    const commonProps = {
      editorInteractionsEnabled: true,
      exclusionRects: {},
      isCatalogDrawerOpen: false,
      onInvalidSelectedItemDetailValue: vi.fn(() => 'Invalid value'),
      onOpenDeleteDialog: vi.fn(),
      onRotateSelection: vi.fn(),
      onUpdateSelectedItemDetails: vi.fn(),
      selectedToolbarGeometry: {
        kind: 'available' as const,
        selectedId: FURNITURE_ITEM.id,
        source: 'render-bounds' as const,
        canvasSize: { width: 800, height: 600 },
        points: [
          { x: 360, y: 280 },
          { x: 440, y: 280 },
          { x: 360, y: 340 },
          { x: 440, y: 340 },
        ],
      },
      startupOverlayActive: false,
    }

    const { rerender } = render(
      <SelectedItemControls {...commonProps} selectedFurniture={null} />,
    )

    rerender(
      <SelectedItemControls
        {...commonProps}
        selectedFurniture={FURNITURE_ITEM}
      />,
    )

    const toolbar = screen.getByRole('region', {
      name: 'Selected item actions',
    })

    await waitFor(() => {
      expect(toolbar).toHaveStyle({
        transform: 'translate3d(318px, 216px, 0)',
      })
    })

    getBoundingClientRect.mockRestore()
    vi.unstubAllGlobals()
  })

  it('docks the toolbar when scene geometry belongs to the previous selection', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const staleGeometry = {
      kind: 'available' as const,
      selectedId: FURNITURE_ITEM.id,
      source: 'render-bounds' as const,
      canvasSize: { width: 800, height: 600 },
      points: [
        { x: 360, y: 280 },
        { x: 440, y: 280 },
        { x: 360, y: 340 },
        { x: 440, y: 340 },
      ],
    }

    const { rerender } = render(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={staleGeometry}
        startupOverlayActive={false}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Selected item actions' }),
    ).toHaveAttribute('data-selected-toolbar-mode', 'floating')

    rerender(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={OTHER_FURNITURE_ITEM}
        selectedToolbarGeometry={staleGeometry}
        startupOverlayActive={false}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Selected item actions' }),
    ).toHaveAttribute('data-selected-toolbar-mode', 'docked')

    vi.unstubAllGlobals()
  })

  it('marks the toolbar as docked when geometry falls back to object origin', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    render(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'object-origin',
          canvasSize: { width: 800, height: 600 },
          points: [{ x: 400, y: 300 }],
        }}
        startupOverlayActive={false}
      />,
    )

    const toolbar = screen.getByRole('region', {
      name: 'Selected item actions',
    })
    expect(toolbar).toHaveAttribute('data-selected-toolbar-mode', 'docked')
    expect(toolbar).toHaveAttribute('data-selected-toolbar-side', 'docked')

    vi.unstubAllGlobals()
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

    const xInput = screen.getByLabelText('Distance from left wall (m)')

    await user.clear(xInput)
    await user.type(xInput, '1.4')
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(onUpdateSelectedItemDetails).not.toHaveBeenCalled()
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('clears delete blur suppression when remove is clicked without a focused detail input', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()
    const onUpdateSelectedItemDetails = vi.fn(() => ({
      ok: true as const,
      item: {
        ...FURNITURE_ITEM,
        position: [-0.5, 0, 0] as [number, number, number],
      },
    }))

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

    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    const xInput = screen.getByLabelText('Distance from left wall (m)')
    await user.clear(xInput)
    await user.type(xInput, '1.4')
    await user.tab()

    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
    expect(onUpdateSelectedItemDetails).toHaveBeenCalledTimes(1)
    expect(onUpdateSelectedItemDetails).toHaveBeenCalledWith({
      field: 'positionX',
      fieldLabel: 'Distance from left wall (m)',
      value: 1.4,
    })
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
