// @vitest-environment jsdom
import { createEvent, fireEvent, render, screen } from '@/test/render'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactNode } from 'react'
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
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import {
  focusActions,
  getPendingFocus,
  resetFocusStore,
} from '@/core/stores/focus-store'
import { SelectedDetailsPanel } from './selected-details-panel'
import { FloatingSelectedItemSite } from './floating-selected-item-site'
import { SelectedItemInteractionProvider } from './selected-item-interaction-provider'
import { SelectedItemPlacementProvider } from './selected-item-placement-provider'
import type { SelectedItemPlacement } from './selected-item-placement.types'
import { FURNITURE_ITEM } from '@/test/support/furniture'

beforeEach(() => {
  resetDialogStore()
  resetEditorLifecycleStore()
  resetSceneDocumentStore()
  resetSelectionStore()
  resetFocusStore()
  editorLifecycleActions.markAssetsReady()
  sceneDocumentActions.setHistory(createHistoryState([FURNITURE_ITEM]))
  selectionActions.setSelection(FURNITURE_ITEM.id)
})

describe('SelectedDetailsPanel', () => {
  it('renders the details controls when hidden placement still shows details', () => {
    renderPanel({
      placement: { site: 'hidden', reason: 'computed-hidden' },
      children: <SelectedDetailsPanel />,
    })

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('toolbar', { name: 'Selected item actions' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('Distance from left wall (m)'),
    ).toBeInTheDocument()
  })

  it('renders the details controls when floating actions also render', () => {
    renderPanel({
      placement: {
        site: 'floating',
        candidateId: 'bottom-center',
        left: 12,
        top: 24,
      },
      children: (
        <>
          <FloatingSelectedItemSite />
          <SelectedDetailsPanel />
        </>
      ),
    })

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('toolbar', { name: 'Selected item actions' }),
    ).toHaveLength(1)
    expect(
      screen.getByLabelText('Distance from left wall (m)'),
    ).toBeInTheDocument()
  })

  it('realizes an inspector directive on the first details control', () => {
    focusActions.setPendingFocus({ surface: 'inspector' })

    renderPanel({
      placement: { site: 'hidden', reason: 'computed-hidden' },
      children: <SelectedDetailsPanel />,
    })

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveFocus()
    expect(getPendingFocus()).toBeNull()
  })

  it('realizes an item-actions directive on the floating toolbar when it shows', () => {
    focusActions.setPendingFocus({ surface: 'item-actions' })

    renderPanel({
      placement: {
        site: 'floating',
        candidateId: 'bottom-center',
        left: 12,
        top: 24,
      },
      children: (
        <>
          <FloatingSelectedItemSite />
          <SelectedDetailsPanel />
        </>
      ),
    })

    expect(
      screen
        .getByRole('toolbar', { name: 'Selected item actions' })
        .querySelector('button'),
    ).toHaveFocus()
    expect(getPendingFocus()).toBeNull()
  })

  it('forwards an item-actions directive to the inspector while the toolbar is hidden', () => {
    focusActions.setPendingFocus({ surface: 'item-actions' })

    renderPanel({
      placement: { site: 'hidden', reason: 'computed-hidden' },
      children: (
        <>
          <FloatingSelectedItemSite />
          <SelectedDetailsPanel />
        </>
      ),
    })

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveFocus()
    expect(getPendingFocus()).toBeNull()
  })

  it('does not render the floating toolbar when placement is hidden', () => {
    renderPanel({
      placement: { site: 'hidden', reason: 'computed-hidden' },
      children: (
        <>
          <FloatingSelectedItemSite />
          <SelectedDetailsPanel />
        </>
      ),
    })

    expect(
      screen.queryAllByRole('toolbar', { name: 'Selected item actions' }),
    ).toHaveLength(0)
    expect(
      screen.getByLabelText('Distance from left wall (m)'),
    ).toBeInTheDocument()
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
      { kind: 'open-delete-dialog', originSurface: 'item-actions' },
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

function renderPanel({
  placement,
  children,
}: {
  placement: SelectedItemPlacement
  children: ReactNode
}) {
  const roomViewRef = createRef<HTMLElement>()
  const registerExclusionElement = vi.fn(() => vi.fn())

  render(
    <TooltipProvider>
      <EditorRefsProvider value={{ roomViewRef }}>
        <OverlayExclusionProvider
          registerExclusionElement={registerExclusionElement}
          exclusionRects={{}}
        >
          <SelectedItemInteractionProvider>
            <SelectedItemPlacementProvider
              value={{ placement, actionsSizeRef: vi.fn() }}
            >
              <CommandDispatchProvider value={vi.fn()}>
                {children}
              </CommandDispatchProvider>
            </SelectedItemPlacementProvider>
          </SelectedItemInteractionProvider>
        </OverlayExclusionProvider>
      </EditorRefsProvider>
    </TooltipProvider>,
  )
}

function renderFloatingActions(dispatch: CommandDispatch) {
  render(
    <TooltipProvider>
      <EditorRefsProvider value={{ roomViewRef: createRef<HTMLElement>() }}>
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
              <FloatingSelectedItemSite />
            </SelectedItemPlacementProvider>
          </SelectedItemInteractionProvider>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>,
  )
}
