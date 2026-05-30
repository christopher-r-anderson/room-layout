// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RefObject } from 'react'
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

function createRoomViewRef(
  rect: DOMRectReadOnly = createRect(800, 600),
): RefObject<HTMLElement | null> {
  const element = document.createElement('section')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect)

  return { current: element }
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  private readonly callback: ResizeObserverCallback

  readonly observe = vi.fn<(target: Element) => void>()
  readonly unobserve = vi.fn<(target: Element) => void>()
  readonly disconnect = vi.fn<() => void>()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  trigger() {
    this.callback([], this)
  }
}

function installResizeObserver() {
  MockResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
}

function triggerAllResizeObservers() {
  act(() => {
    MockResizeObserver.instances.forEach((observer) => {
      observer.trigger()
    })
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  MockResizeObserver.instances = []
})

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
        roomViewRef={createRoomViewRef()}
        selectedFurniture={FURNITURE_ITEM}
        startupOverlayActive={false}
      />,
    )

    expect(
      screen.getByRole('region', { name: 'Selected item actions' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove item' })).toBeVisible()
  })

  it('marks the toolbar as floating when scene geometry is available', async () => {
    installResizeObserver()
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
        roomViewRef={createRoomViewRef()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'render-bounds',
          canvasSize: { width: 800, height: 600 },
          sourcePointCount: 8,
          projectedPointCount: 4,
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

    triggerAllResizeObservers()

    await waitFor(() => {
      const toolbar = screen.getByRole('region', {
        name: 'Selected item actions',
      })
      expect(toolbar).toHaveAttribute(
        'data-selected-toolbar-candidate',
        'top-center',
      )
      expect(toolbar).toHaveAttribute('data-selected-toolbar-mode', 'floating')
    })
  })

  it('docks the toolbar when scene geometry belongs to the previous selection', () => {
    installResizeObserver()
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
      sourcePointCount: 8,
      projectedPointCount: 4,
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
        roomViewRef={createRoomViewRef()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={staleGeometry}
        startupOverlayActive={false}
      />,
    )

    triggerAllResizeObservers()

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
        roomViewRef={createRoomViewRef()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'object-origin',
          canvasSize: { width: 800, height: 600 },
          sourcePointCount: 1,
          projectedPointCount: 1,
          points: [{ x: 400, y: 300 }],
        }}
        startupOverlayActive={false}
      />,
    )

    const toolbar = screen.getByRole('region', {
      name: 'Selected item actions',
    })
    expect(toolbar).toHaveAttribute('data-selected-toolbar-mode', 'docked')

    vi.unstubAllGlobals()
  })

  it('hides the toolbar from rendering and accessibility when placement resolves to hidden', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const { container } = render(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        roomViewRef={createRoomViewRef()}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'render-bounds',
          canvasSize: { width: 800, height: 600 },
          sourcePointCount: 8,
          projectedPointCount: 0,
          points: [],
        }}
        startupOverlayActive={false}
      />,
    )

    const toolbar = container.querySelector<HTMLElement>(
      'section[aria-label="Selected item actions"]',
    )

    expect(toolbar).not.toBeNull()
    expect(toolbar).toHaveAttribute('aria-hidden', 'true')
    expect(toolbar).toHaveStyle({ visibility: 'hidden' })

    vi.unstubAllGlobals()
  })

  it('forces docked placement until the room view rect is measured', async () => {
    installResizeObserver()
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
        roomViewRef={{ current: null }}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'render-bounds',
          canvasSize: { width: 800, height: 600 },
          sourcePointCount: 8,
          projectedPointCount: 4,
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

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Selected item actions' }),
      ).toHaveAttribute('data-selected-toolbar-mode', 'docked')
    })
  })

  it('converts canvas-local geometry into viewport coordinates using the room view rect', async () => {
    installResizeObserver()
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
        roomViewRef={createRoomViewRef({
          x: 100,
          y: 50,
          left: 100,
          top: 50,
          right: 900,
          bottom: 650,
          width: 800,
          height: 600,
          toJSON: () => ({}),
        })}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={{
          kind: 'available',
          selectedId: FURNITURE_ITEM.id,
          source: 'render-bounds',
          canvasSize: { width: 400, height: 300 },
          sourcePointCount: 8,
          projectedPointCount: 4,
          points: [
            { x: 180, y: 140 },
            { x: 220, y: 140 },
            { x: 180, y: 170 },
            { x: 220, y: 170 },
          ],
        }}
        startupOverlayActive={false}
      />,
    )

    triggerAllResizeObservers()

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Selected item actions' }),
      ).toHaveStyle({
        transform: 'translate3d(430px, 270px, 0)',
      })
    })
  })

  it('preserves the previous floating candidate across same-id selection refreshes', async () => {
    installResizeObserver()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const roomViewRef = createRoomViewRef()
    const initialToolbarGeometry = {
      kind: 'available' as const,
      selectedId: FURNITURE_ITEM.id,
      source: 'render-bounds' as const,
      canvasSize: { width: 800, height: 600 },
      sourcePointCount: 8,
      projectedPointCount: 4,
      points: [
        { x: 20, y: 280 },
        { x: 120, y: 280 },
        { x: 20, y: 360 },
        { x: 120, y: 360 },
      ],
    }
    const refreshedToolbarGeometry = {
      ...initialToolbarGeometry,
      points: [
        { x: 120, y: 280 },
        { x: 220, y: 280 },
        { x: 120, y: 360 },
        { x: 220, y: 360 },
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
        roomViewRef={roomViewRef}
        selectedFurniture={FURNITURE_ITEM}
        selectedToolbarGeometry={initialToolbarGeometry}
        startupOverlayActive={false}
      />,
    )

    triggerAllResizeObservers()

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Selected item actions' }),
      ).toHaveAttribute('data-selected-toolbar-candidate', 'top-right')
    })

    rerender(
      <SelectedItemControls
        editorInteractionsEnabled
        exclusionRects={{}}
        isCatalogDrawerOpen={false}
        onInvalidSelectedItemDetailValue={vi.fn(() => 'Invalid value')}
        onOpenDeleteDialog={vi.fn()}
        onRotateSelection={vi.fn()}
        onUpdateSelectedItemDetails={vi.fn()}
        roomViewRef={roomViewRef}
        selectedFurniture={{
          ...FURNITURE_ITEM,
          position: [0.5, 0, 0],
        }}
        selectedToolbarGeometry={refreshedToolbarGeometry}
        startupOverlayActive={false}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('region', { name: 'Selected item actions' }),
      ).toHaveAttribute('data-selected-toolbar-candidate', 'top-right')
    })
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
