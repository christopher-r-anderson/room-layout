// @vitest-environment jsdom
import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { OverlayExclusionProvider } from '@/shared/layout/overlay-exclusion-provider'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import type { CommandDispatch } from '@/core/commands/command-dispatch-context'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { resetDialogStore } from '@/core/stores/dialog-store'
import {
  sceneDocumentActions,
  resetSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { SelectedDetailsPanel } from './selected-details-panel'
import { FloatingSelectedItemSite } from './floating-selected-item-site'
import { SelectedItemInteractionProvider } from './selected-item-interaction-provider'
import { SelectedItemPlacementProvider } from './selected-item-placement-provider'
import { FURNITURE_ITEM } from './test-fixtures'

beforeEach(() => {
  resetDialogStore()
  resetEditorLifecycleStore()
  resetSceneDocumentStore()
  editorLifecycleActions.markAssetsReady()
  sceneDocumentActions.setHistory(createHistoryState([FURNITURE_ITEM]))
  sceneDocumentActions.setSelectedId(FURNITURE_ITEM.id)
})

describe('SelectedDetailsPanel', () => {
  it('attaches the controls ref when hidden placement still shows details', () => {
    const roomViewRef = createRef<HTMLElement>()
    const detailsPanelRef = createRef<HTMLDivElement>()
    const selectedToolbarRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, detailsPanelRef, selectedToolbarRef }}
        >
          <OverlayExclusionProvider
            registerExclusionElement={registerExclusionElement}
            exclusionRects={{}}
          >
            <SelectedItemInteractionProvider>
              <SelectedItemPlacementProvider
                value={{
                  placement: {
                    site: 'hidden',
                    reason: 'computed-hidden',
                  },
                  actionsSizeRef: vi.fn(),
                }}
              >
                <CommandDispatchProvider value={vi.fn()}>
                  <SelectedDetailsPanel isCatalogDrawerOpen={false} />
                </CommandDispatchProvider>
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayExclusionProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Selected item actions' }),
    ).not.toBeInTheDocument()
    expect(detailsPanelRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
    expect(detailsPanelRef.current).toContainElement(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
  })

  it('keeps the details panel ref when floating actions also render', () => {
    const roomViewRef = createRef<HTMLElement>()
    const detailsPanelRef = createRef<HTMLDivElement>()
    const selectedToolbarRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, detailsPanelRef, selectedToolbarRef }}
        >
          <OverlayExclusionProvider
            registerExclusionElement={registerExclusionElement}
            exclusionRects={{}}
          >
            <SelectedItemInteractionProvider>
              <SelectedItemPlacementProvider
                value={{
                  placement: {
                    site: 'floating',
                    candidateId: 'bottom-center',
                    left: 12,
                    top: 24,
                  },
                  actionsSizeRef: vi.fn(),
                }}
              >
                <CommandDispatchProvider value={vi.fn()}>
                  <FloatingSelectedItemSite isCatalogDrawerOpen={false} />
                  <SelectedDetailsPanel isCatalogDrawerOpen={false} />
                </CommandDispatchProvider>
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayExclusionProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('region', { name: 'Selected item actions' }),
    ).toHaveLength(1)
    expect(detailsPanelRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })

  it('does not render the floating toolbar when placement is hidden', () => {
    const roomViewRef = createRef<HTMLElement>()
    const detailsPanelRef = createRef<HTMLDivElement>()
    const selectedToolbarRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, detailsPanelRef, selectedToolbarRef }}
        >
          <OverlayExclusionProvider
            registerExclusionElement={registerExclusionElement}
            exclusionRects={{}}
          >
            <SelectedItemInteractionProvider>
              <SelectedItemPlacementProvider
                value={{
                  placement: {
                    site: 'hidden',
                    reason: 'computed-hidden',
                  },
                  actionsSizeRef: vi.fn(),
                }}
              >
                <CommandDispatchProvider value={vi.fn()}>
                  <FloatingSelectedItemSite isCatalogDrawerOpen={false} />
                  <SelectedDetailsPanel isCatalogDrawerOpen={false} />
                </CommandDispatchProvider>
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayExclusionProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.queryAllByRole('region', { name: 'Selected item actions' }),
    ).toHaveLength(0)
    expect(detailsPanelRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })

  it('dispatches rotate and delete commands from the floating actions', async () => {
    const user = userEvent.setup()
    const dispatch: CommandDispatch = vi.fn()

    renderFloatingActions(dispatch)

    await user.click(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
    await user.click(screen.getByRole('button', { name: 'Rotate clockwise' }))
    await user.click(screen.getByRole('button', { name: 'Remove item' }))

    expect(vi.mocked(dispatch).mock.calls.map(([command]) => command)).toEqual([
      { kind: 'rotate-selection', direction: 1 },
      { kind: 'rotate-selection', direction: -1 },
      { kind: 'open-delete-dialog', returnFocusTo: 'outliner' },
    ])
  })

  it('returns focus to the room view on an Escape that reaches the toolbar', () => {
    const dispatch: CommandDispatch = vi.fn()
    renderFloatingActions(dispatch)

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
      { key: 'Escape' },
    )

    expect(vi.mocked(dispatch).mock.calls.map(([command]) => command)).toEqual([
      { kind: 'focus-room-view' },
    ])
  })

  it('leaves an Escape already handled by a child (e.g. a tooltip) to that child', () => {
    const dispatch: CommandDispatch = vi.fn()
    renderFloatingActions(dispatch)

    const button = screen.getByRole('button', {
      name: 'Rotate counterclockwise',
    })
    const handledEscape = createEvent.keyDown(button, { key: 'Escape' })
    handledEscape.preventDefault()
    fireEvent(button, handledEscape)

    expect(dispatch).not.toHaveBeenCalled()
  })
})

function renderFloatingActions(dispatch: CommandDispatch) {
  render(
    <TooltipProvider>
      <EditorRefsProvider
        value={{
          roomViewRef: createRef<HTMLElement>(),
          detailsPanelRef: createRef<HTMLDivElement>(),
          selectedToolbarRef: createRef<HTMLDivElement>(),
        }}
      >
        <CommandDispatchProvider value={dispatch}>
          <SelectedItemInteractionProvider>
            <SelectedItemPlacementProvider
              value={{
                placement: {
                  site: 'floating',
                  candidateId: 'bottom-center',
                  left: 12,
                  top: 24,
                },
                actionsSizeRef: vi.fn(),
              }}
            >
              <FloatingSelectedItemSite isCatalogDrawerOpen={false} />
            </SelectedItemPlacementProvider>
          </SelectedItemInteractionProvider>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>,
  )
}
