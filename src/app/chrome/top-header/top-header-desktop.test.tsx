// @vitest-environment jsdom

import { render, screen } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import { TopHeaderDesktop } from './top-header-desktop'
import { EditorRectsProvider } from '@/core/layout/editor-rects-provider'
import type { ReactNode } from 'react'

vi.mock('@/features/catalog/catalog-drawer', () => ({
  CatalogDrawer: ({ triggerButton }: { triggerButton?: ReactNode }) => (
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
    triggerButton?: ReactNode
  }) => <>{triggerButton ?? null}</>,
}))

vi.mock('@/features/project-info/project-info-dialog', () => ({
  ProjectInfoDialog: ({ triggerButton }: { triggerButton?: ReactNode }) => (
    <>{triggerButton ?? null}</>
  ),
}))

vi.mock('@/shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
}))

vi.mock('@/features/room-surface/room-sidebar', () => ({
  RoomSidebar: () => null,
}))

vi.mock('./start-over-button', () => ({
  StartOverButton: () => <button type="button">Start over</button>,
}))

function renderDesktopHeader() {
  return render(
    <EditorRectsProvider registerRect={() => vi.fn()} rects={{}}>
      <TopHeaderDesktop />
    </EditorRectsProvider>,
  )
}

describe('TopHeaderDesktop', () => {
  it('describes the room trigger with wall and floor copy', () => {
    renderDesktopHeader()

    expect(
      screen.getByText('Adjust wall, floor, and lighting'),
    ).toBeInTheDocument()
  })

  it('keeps share as a direct visible action in the desktop header', () => {
    renderDesktopHeader()

    const desktopHeaderRoot = screen.getByRole('toolbar', {
      name: 'Editor actions',
    })
    const shareButton = screen.getByRole('button', {
      name: 'Share room layout',
    })

    expect(desktopHeaderRoot).toContainElement(shareButton)
    expect(shareButton).toBeVisible()
  })
})
