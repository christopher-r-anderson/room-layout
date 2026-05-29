// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import { TopHeaderMobile } from './top-header-mobile'
import type { TopHeaderMobileProps } from './top-header.types'

vi.mock('@/app/catalog/catalog-drawer', () => ({
  CatalogDrawer: () => <button type="button">Add furniture</button>,
}))

vi.mock('@/app/history/history-tools', () => ({
  HistoryTools: () => <div />,
}))

vi.mock('./room-drawer', () => ({
  RoomDrawer: () => null,
}))

vi.mock('./share-scene-button', () => ({
  ShareSceneButton: () => <button type="button">Share room layout</button>,
}))

function createFloorOptions(): FloorFinishOption[] {
  return [
    {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/textures/wood.jpg',
      normalPath: '/textures/wood-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
  ]
}

function createWallOptions(): WallFinishOption[] {
  return [{ id: 'light-gray', label: 'Light Gray', color: 0xf5f5f5 }]
}

function createProps(
  overrides: Partial<TopHeaderMobileProps> = {},
): TopHeaderMobileProps {
  return {
    catalog: {
      catalog: [],
      catalogIdToAdd: '',
      isCatalogDrawerOpen: false,
      onAddFurniture: vi.fn(() => true),
      onCatalogIdToAddChange: vi.fn(),
      onCatalogDrawerOpenChange: vi.fn(),
    },
    dialogs: {
      roomSurfaceLayout: null,
      isBlockingOverlayOpen: false,
      isRoomSurfaceOpen: false,
      isInfoDialogOpen: false,
      isKeyboardShortcutsDialogOpen: false,
      isMobileMoreOpen: false,
      isStartOverDialogOpen: false,
      onCloseStartOverDialog: vi.fn(),
      onConfirmStartOver: vi.fn(),
      onRoomSurfaceOpenChange: vi.fn(() => true),
      onInfoDialogOpenChange: vi.fn(() => true),
      onKeyboardShortcutsDialogOpenChange: vi.fn(() => true),
      onMobileMoreOpenChange: vi.fn(() => true),
      onOpenStartOverDialog: vi.fn(),
      returnFocusTarget: null,
    },
    editorInteractionsEnabled: true,
    floorFinishId: 'wood-floor',
    floorFinishLoading: false,
    floorFinishes: createFloorOptions(),
    history: {
      canRedo: false,
      canUndo: false,
      onRedo: vi.fn(),
      onUndo: vi.fn(),
    },
    mobileMoreContentId: 'mobile-more-content',
    mobileRoomTriggerId: 'mobile-room-trigger',
    mobileMoreTriggerId: 'mobile-more-trigger',
    startOverDisabled: false,
    onFloorFinishChange: vi.fn(),
    onOpenKeyboardShortcutsFromMobileMore: vi.fn(),
    onOpenProjectInfoFromMobileMore: vi.fn(),
    onOpenStartOverFromMobileMore: vi.fn(),
    onShareSceneUrl: vi.fn(() =>
      Promise.resolve<'shared' | 'copied' | null>(null),
    ),
    onWallFinishChange: vi.fn(),
    wallFinishId: 'light-gray',
    wallFinishes: createWallOptions(),
    focusControlById: vi.fn(),
    ...overrides,
  }
}

describe('TopHeaderMobile', () => {
  it('exposes dialog trigger semantics for the More actions drawer', () => {
    const baseProps = createProps()

    render(
      <TopHeaderMobile
        {...createProps({
          dialogs: {
            ...baseProps.dialogs,
            isMobileMoreOpen: true,
          },
        })}
      />,
    )

    const trigger = screen.getByRole('button', {
      name: 'More actions',
      hidden: true,
    })
    const dialog = screen.getByRole('dialog', { name: 'More actions' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-more-content')
    expect(dialog).toHaveAttribute('id', 'mobile-more-content')
  })

  it('opens the More actions drawer through shared dialog state', async () => {
    const user = userEvent.setup()
    const onMobileMoreOpenChange = vi.fn(() => true)
    const baseProps = createProps()

    render(
      <TopHeaderMobile
        {...createProps({
          dialogs: {
            ...baseProps.dialogs,
            onMobileMoreOpenChange,
          },
        })}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'More actions' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(onMobileMoreOpenChange).toHaveBeenCalledWith(true, {
      returnFocusTarget: 'mobile-more',
    })
  })

  it('keeps share inside the More actions drawer instead of the mobile header row', () => {
    const baseProps = createProps()

    const { container } = render(
      <TopHeaderMobile
        {...createProps({
          dialogs: {
            ...baseProps.dialogs,
            isMobileMoreOpen: true,
          },
        })}
      />,
    )

    const mobileHeaderRoot = container.querySelector('[data-top-header-root]')

    expect(mobileHeaderRoot).not.toContainElement(
      screen.getByRole('button', { name: 'Share room layout' }),
    )
    expect(
      screen.getByRole('button', { name: 'Share room layout' }),
    ).toBeVisible()
  })
})
