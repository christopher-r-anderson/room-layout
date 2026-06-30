// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

function createProps(
  overrides: Partial<TopHeaderDesktopProps> = {},
): TopHeaderDesktopProps {
  return {
    desktopRoomSidebarRef: undefined,
    history: {
      canRedo: false,
      canUndo: false,
    },
    isRoomSurfaceOpen: false,
    isKeyboardShortcutsOpen: false,
    isProjectInfoOpen: false,
    startOverDisabled: false,
    topHeaderRef: undefined,
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
