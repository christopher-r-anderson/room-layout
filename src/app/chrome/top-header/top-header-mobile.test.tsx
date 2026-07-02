// @vitest-environment jsdom

import { render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopHeaderMobile } from './top-header-mobile'
import { dialogActions, resetDialogStore } from '@/core/stores/dialog-store'
import { DIALOG_DEFINITIONS, DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { OverlayExclusionProvider } from '@/shared/layout/overlay-exclusion-provider'

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

beforeEach(() => {
  resetDialogStore()
})

// The header now reads dialog state from the store, so tests that need the More
// actions drawer open register the definitions and open it directly.
function openMoreActionsDialog() {
  dialogActions.registerDialogDefinitions(DIALOG_DEFINITIONS)
  dialogActions.configureRuntimeContext({
    isDialogsEnabled: () => true,
    getSelectedFurniture: () => null,
    canStartOver: () => false,
  })
  dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, true)
}

function renderMobileHeader() {
  return render(
    <CommandDispatchProvider value={vi.fn()}>
      <OverlayExclusionProvider
        registerExclusionElement={() => vi.fn()}
        exclusionRects={{}}
      >
        <TopHeaderMobile />
      </OverlayExclusionProvider>
    </CommandDispatchProvider>,
  )
}

describe('TopHeaderMobile', () => {
  it('describes the room trigger with wall and floor copy', () => {
    renderMobileHeader()

    expect(
      screen.getByText('Adjust wall, floor, and lighting'),
    ).toBeInTheDocument()
  })

  it('exposes dialog trigger semantics for the More actions drawer', () => {
    openMoreActionsDialog()
    renderMobileHeader()

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
    const openDialog = vi
      .spyOn(dialogActions, 'openDialog')
      .mockReturnValue(true)

    renderMobileHeader()

    const trigger = screen.getByRole('button', { name: 'More actions' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(openDialog).toHaveBeenCalledWith(DIALOG_IDS.headerMoreActions)

    openDialog.mockRestore()
  })

  it('keeps share inside the More actions drawer instead of the mobile header row', () => {
    openMoreActionsDialog()
    const { container } = renderMobileHeader()

    const mobileHeaderRoot = container.querySelector('[data-top-header-root]')

    expect(mobileHeaderRoot).not.toContainElement(
      screen.getByRole('button', { name: 'Share room layout' }),
    )
    expect(
      screen.getByRole('button', { name: 'Share room layout' }),
    ).toBeVisible()
  })
})
