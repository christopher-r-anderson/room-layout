// @vitest-environment jsdom

import { flushMicrotasks, render, screen, waitFor, within } from '@/test/render'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/domain/furniture'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { CATALOG_DIALOG_ID } from '@/features/catalog/catalog-dialog-definition'
import { ROOM_SURFACE_DIALOG_ID } from '@/features/room-surface/room-surface-dialog-definition'
import { resetDialogStore } from '@/core/stores/dialog-store'
import { dialogActions } from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import { OverlayExclusionProvider } from '../../shared/layout/overlay-exclusion-provider'
import { EditorRefsProvider } from '../../shared/providers/editor-refs-provider'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { SelectedItemPlacementProvider } from '@/features/selection/selected-item-placement-provider'
import { EditorHeader, EditorPanels } from './editor-overlay'

vi.mock('@/shared/layout/use-header-layout-mode', () => ({
  useHeaderLayoutMode: () => 'desktop' as const,
}))

vi.mock('@/shared/ui/select', () => {
  function collectItemValues(
    node: React.ReactNode,
    values: string[] = [],
  ): string[] {
    React.Children.forEach(node, (child) => {
      if (
        !React.isValidElement<{
          value?: string
          children?: React.ReactNode
        }>(child)
      ) {
        return
      }

      const childProps = child.props

      if (typeof childProps.value === 'string') {
        values.push(childProps.value)
      }

      if (childProps.children) {
        collectItemValues(childProps.children, values)
      }
    })

    return values
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string
      onValueChange: (value: string) => void
      children: React.ReactNode
    }) => {
      const values = collectItemValues(children)

      return (
        <div data-current-value={value}>
          {children}
          <div>
            {values.map((itemValue) => (
              <button
                key={itemValue}
                type="button"
                onClick={() => {
                  onValueChange(itemValue)
                }}
              >
                choose-{itemValue}
              </button>
            ))}
          </div>
        </div>
      )
    },
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectGroup: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectItem: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    SelectTrigger: ({
      children,
      ...props
    }: {
      children: React.ReactNode
      id?: string
      className?: string
      'aria-labelledby'?: string
      'aria-busy'?: boolean
    }) => <button {...props}>{children}</button>,
    SelectValue: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  }
})

vi.mock('../catalog/catalog-drawer', () => ({
  CatalogDrawer: ({ triggerButton }: { triggerButton: React.ReactNode }) => (
    <>{triggerButton}</>
  ),
}))

vi.mock('../history/history-tools', () => ({
  HistoryTools: ({
    canRedo,
    canUndo,
  }: {
    canRedo: boolean
    canUndo: boolean
  }) => (
    <div role="group" aria-label="History Actions">
      <button type="button" disabled={!canUndo}>
        Undo
      </button>
      <button type="button" disabled={!canRedo}>
        Redo
      </button>
    </div>
  ),
}))

vi.mock('../project-info/project-info-dialog', () => ({
  ProjectInfoDialog: ({
    triggerButton,
  }: {
    triggerButton?: React.ReactNode
  }) => <>{triggerButton ?? null}</>,
}))

vi.mock('../keyboard/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsDialog: ({
    triggerButton,
  }: {
    triggerButton?: React.ReactNode
  }) => <>{triggerButton ?? null}</>,
}))

vi.mock('../camera/camera-tools', () => ({
  CameraTools: () => (
    <div role="group" aria-label="Camera">
      <button type="button">Focus Selected</button>
    </div>
  ),
}))

vi.mock('../selection/delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => null,
}))

function createSelectedFurniture(): FurnitureItem {
  return {
    id: 'item-1',
    catalogId: 'catalog-armchair',
    name: 'Leather Armchair',
    kind: 'armchair',
    collectionId: 'leather-collection',
    nodeName: 'armchair',
    sourcePath: '/models/leather-collection.glb',
    footprintSize: { width: 1.2, depth: 1.1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

beforeEach(() => {
  resetDialogStore()
  resetEditorLifecycleStore()
  sceneDocumentActions.reset()
  resetSelectionStore()
  dialogActions.configureRuntimeContext({
    isDialogsEnabled: () => true,
    getSelectedFurniture: () => null,
    canStartOver: () => true,
  })
  dialogActions.registerDialogDefinitions([
    {
      id: CATALOG_DIALOG_ID,
      kind: 'blocking',
    },
    {
      id: ROOM_SURFACE_DIALOG_ID,
      kind: 'non-blocking',
      canOpen: (context) => context.isDialogsEnabled(),
    },
  ])
  editorLifecycleActions.markAssetsReady()
})

describe('editor chrome integration', () => {
  it('wires outliner reverse-tab handoff and room focus return across the shell', async () => {
    const user = userEvent.setup()
    const selectedFurniture = createSelectedFurniture()
    const registerExclusionElement = vi.fn(() => vi.fn())

    sceneDocumentActions.setHistory(createHistoryState([selectedFurniture]))
    selectionActions.setSelection(selectedFurniture.id)
    sceneDocumentActions.setFloorFinishId('wood-floor')
    sceneDocumentActions.setWallFinishId('light-gray')

    function TestHarness() {
      const detailsPanelRef = React.useRef<HTMLDivElement | null>(null)
      const roomViewRef = React.useRef<HTMLElement | null>(null)
      const selectedToolbarRef = React.useRef<HTMLDivElement | null>(null)
      const placementValue = React.useMemo(
        () => ({
          placement: {
            site: 'hidden' as const,
            reason: 'computed-hidden' as const,
          },
          actionsSizeRef: () => undefined,
        }),
        [],
      )

      return (
        <TooltipProvider>
          <EditorRefsProvider
            value={{ roomViewRef, detailsPanelRef, selectedToolbarRef }}
          >
            <OverlayExclusionProvider
              registerExclusionElement={registerExclusionElement}
              exclusionRects={{}}
            >
              <SelectedItemInteractionProvider>
                <SelectedItemPlacementProvider value={placementValue}>
                  <CommandDispatchProvider value={vi.fn()}>
                    {/* Mirrors the EditorBody shell: header chrome precedes
                        the panels inside main. */}
                    <div className="relative min-h-192">
                      <header>
                        <EditorHeader />
                      </header>
                      <main>
                        <EditorPanels />
                      </main>
                    </div>
                  </CommandDispatchProvider>
                </SelectedItemPlacementProvider>
              </SelectedItemInteractionProvider>
            </OverlayExclusionProvider>
          </EditorRefsProvider>
        </TooltipProvider>
      )
    }

    render(<TestHarness />)

    const outlinerItem = screen.getByRole('button', {
      name: /Leather Armchair/i,
    })

    // Focusing an item inside the outliner scroll area schedules a deferred
    // re-measure; focus inside act (via flushMicrotasks) so the state update
    // commits wrapped.
    await flushMicrotasks(() => {
      outlinerItem.focus()
    })
    expect(outlinerItem).toHaveFocus()

    await user.tab()

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveFocus()

    await user.tab()

    expect(screen.getByLabelText('Distance from back wall (m)')).toHaveFocus()

    await user.tab()

    expect(screen.getByLabelText('Rotation (deg)')).toHaveFocus()

    const environmentTrigger = screen.getByRole('button', { name: 'Room' })

    await user.click(environmentTrigger)

    const environmentDialog = screen.getByRole('complementary', {
      name: 'Room',
    })
    expect(environmentDialog).toBeVisible()

    expect(screen.getByRole('toolbar', { name: 'Camera' })).toBeVisible()

    await user.click(
      within(environmentDialog).getByRole('button', {
        name: 'Close room panel',
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('complementary', { name: 'Room' }),
      ).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(environmentTrigger).toHaveFocus()
    })
    expect(screen.getByRole('toolbar', { name: 'Camera' })).toBeVisible()
  })
})
