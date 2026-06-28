// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { ROOM_TRIGGER_TOOLTIP } from '@/features/room-surface/room-copy'
import { TopHeaderMobile } from './top-header-mobile'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'
import type { TopHeaderMobileProps } from './top-header.types'

vi.mock('@/features/catalog/catalog-drawer', () => ({
  CatalogDrawer: () => <button type="button">Add furniture</button>,
}))

vi.mock('@/features/history/history-tools', () => ({
  HistoryTools: () => <div />,
}))

vi.mock('@/features/room-surface/room-drawer', () => ({
  RoomDrawer: () => null,
}))

vi.mock('./share-scene-button', () => ({
  ShareSceneButton: () => <button type="button">Share room layout</button>,
}))

vi.mock('@/shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
  TooltipTrigger: ({ render }: { render: React.ReactNode }) => <>{render}</>,
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

function createLightingMoodOptions(): LightingMoodOption[] {
  return [
    {
      id: 'daylight',
      label: 'Daylight',
      exposure: 1.05,
      ambientIntensity: 0.35,
      hemisphereSkyColor: 0xf1f6ff,
      hemisphereGroundColor: 0xaeb9c9,
      hemisphereIntensity: 0.55,
      keyLightColor: 0xfff4e6,
      keyLightIntensity: 1,
      fillLightColor: 0xd5e4ff,
      fillLightIntensity: 0.28,
      environmentColor: 0xdce6f3,
      environmentIntensity: 0.72,
      backgroundIntensity: 0.95,
    },
  ]
}

function createProps(
  overrides: Partial<TopHeaderMobileProps> = {},
): TopHeaderMobileProps {
  return {
    editorInteractionsEnabled: true,
    floorFinishId: 'wood-floor',
    floorFinishLoading: false,
    floorFinishes: createFloorOptions(),
    history: {
      canRedo: false,
      canUndo: false,
    },
    isRoomSurfaceOpen: false,
    isHeaderMoreActionsOpen: false,
    blockingOverlayOpen: false,
    startOverDisabled: false,
    onFloorFinishChange: vi.fn(),
    onOpenKeyboardShortcutsFromHeaderMoreActions: vi.fn(),
    onOpenProjectInfoFromHeaderMoreActions: vi.fn(),
    onOpenStartOverFromHeaderMoreActions: vi.fn(),
    onWallFinishChange: vi.fn(),
    wallFinishId: 'light-gray',
    wallFinishes: createWallOptions(),
    lightingMoodId: 'daylight',
    lightingMoods: createLightingMoodOptions(),
    onLightingMoodChange: vi.fn(),
    ...overrides,
  }
}

describe('TopHeaderMobile', () => {
  it('describes the room trigger with wall and floor copy', () => {
    render(<TopHeaderMobile {...createProps()} />)

    expect(screen.getByText(ROOM_TRIGGER_TOOLTIP)).toBeInTheDocument()
  })

  it('exposes dialog trigger semantics for the More actions drawer', () => {
    render(
      <TopHeaderMobile
        {...createProps({
          isHeaderMoreActionsOpen: true,
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
    expect(trigger).toHaveAttribute(
      'aria-controls',
      'header-more-actions-content',
    )
    expect(dialog).toHaveAttribute('id', 'header-more-actions-content')
  })

  it('opens the More actions drawer through shared dialog state', async () => {
    const user = userEvent.setup()
    const onHeaderMoreActionsOpenChange = vi
      .spyOn(topHeaderDialogOpenChange, 'headerMoreActions')
      .mockReturnValue(true)

    render(<TopHeaderMobile {...createProps()} />)

    const trigger = screen.getByRole('button', { name: 'More actions' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(onHeaderMoreActionsOpenChange).toHaveBeenCalledWith(true)

    onHeaderMoreActionsOpenChange.mockRestore()
  })

  it('keeps share inside the More actions drawer instead of the mobile header row', () => {
    const { container } = render(
      <TopHeaderMobile
        {...createProps({
          isHeaderMoreActionsOpen: true,
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
