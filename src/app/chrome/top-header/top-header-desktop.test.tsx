// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  LightingMoodOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import { ROOM_TRIGGER_TOOLTIP } from '@/features/room-surface/room-copy'
import { TopHeaderDesktop } from './top-header-desktop'
import type { TopHeaderDesktopProps } from './top-header.types'

vi.mock('@/features/catalog/catalog-drawer', () => ({
  CatalogDrawer: ({ triggerButton }: { triggerButton?: React.ReactNode }) => (
    <>{triggerButton ?? null}</>
  ),
}))

vi.mock('@/features/catalog/catalog-add-button', () => ({
  CatalogAddButton: () => <button type="button">Add furniture</button>,
}))

vi.mock('@/features/history/history-tools', () => ({
  HistoryTools: () => <div />,
}))

vi.mock('@/features/keyboard/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsDialog: ({
    triggerButton,
  }: {
    triggerButton?: React.ReactNode
  }) => <>{triggerButton ?? null}</>,
}))

vi.mock('@/features/project-info/project-info-dialog', () => ({
  ProjectInfoDialog: ({
    triggerButton,
  }: {
    triggerButton?: React.ReactNode
  }) => <>{triggerButton ?? null}</>,
}))

vi.mock('@/shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipTrigger: ({ render }: { render: React.ReactNode }) => <>{render}</>,
}))

vi.mock('@/features/room-surface/room-sidebar', () => ({
  RoomSidebar: () => null,
}))

vi.mock('./start-over-button', () => ({
  StartOverButton: () => <button type="button">Start over</button>,
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
  overrides: Partial<TopHeaderDesktopProps> = {},
): TopHeaderDesktopProps {
  return {
    desktopRoomSidebarRef: undefined,
    editorInteractionsEnabled: true,
    floorFinishId: 'wood-floor',
    floorFinishLoading: false,
    floorFinishes: createFloorOptions(),
    history: {
      canRedo: false,
      canUndo: false,
    },
    isRoomSurfaceOpen: false,
    isKeyboardShortcutsOpen: false,
    isProjectInfoOpen: false,
    startOverDisabled: false,
    onFloorFinishChange: vi.fn(),
    onWallFinishChange: vi.fn(),
    topHeaderRef: undefined,
    wallFinishId: 'light-gray',
    wallFinishes: createWallOptions(),
    lightingMoodId: 'daylight',
    lightingMoods: createLightingMoodOptions(),
    onLightingMoodChange: vi.fn(),
    ...overrides,
  }
}

describe('TopHeaderDesktop', () => {
  it('describes the room trigger with wall and floor copy', () => {
    render(<TopHeaderDesktop {...createProps()} />)

    expect(screen.getByText(ROOM_TRIGGER_TOOLTIP)).toBeInTheDocument()
  })

  it('keeps share as a direct visible action in the desktop header', () => {
    const { container } = render(<TopHeaderDesktop {...createProps()} />)

    const desktopHeaderRoot = container.querySelector('[data-top-header-root]')
    const shareButton = screen.getByRole('button', {
      name: 'Share room layout',
    })

    expect(desktopHeaderRoot).toContainElement(shareButton)
    expect(shareButton).toBeVisible()
  })
})
