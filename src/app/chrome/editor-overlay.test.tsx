// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { dialogActions, resetDialogStore } from '@/editor-state/dialog-store'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { OverlayLayoutProvider } from '../../shared/layout/overlay-layout-provider'
import { EditorRefsProvider } from '../../shared/providers/editor-refs-provider'
import { FloatingSelectedItemSite } from '@/features/selection/floating-selected-item-site'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { SelectedItemPlacementProvider } from '@/features/selection/selected-item-placement-provider'
import { EditorOverlay } from './editor-overlay'

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
    onRedo,
    onUndo,
  }: {
    canRedo: boolean
    canUndo: boolean
    onRedo: () => void
    onUndo: () => void
  }) => (
    <div role="group" aria-label="History Actions">
      <button type="button" disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button type="button" disabled={!canRedo} onClick={onRedo}>
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
  CameraTools: ({ onFocusSelected }: { onFocusSelected: () => void }) => (
    <div role="group" aria-label="Camera">
      <button type="button" onClick={onFocusSelected}>
        Focus Selected
      </button>
    </div>
  ),
  ConnectedCameraTools: ({
    onFocusSelected,
  }: {
    onFocusSelected: () => void
  }) => (
    <div role="group" aria-label="Camera">
      <button type="button" onClick={onFocusSelected}>
        Focus Selected
      </button>
    </div>
  ),
}))

vi.mock('../selection/delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => null,
}))

vi.mock('../selection/start-over-confirmation-dialog', () => ({
  StartOverConfirmationDialog: () => null,
}))

vi.mock('../startup/initialization-progress', () => ({
  InitializationProgress: () => null,
}))

vi.mock('../startup/initialization-error', () => ({
  InitializationError: () => null,
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
  resetEditorRuntimeStore()
  sceneStateActions.resetSceneState()
  editorRuntimeActions.markAssetsReady()
})

describe('EditorOverlay integration', () => {
  it('wires outliner reverse-tab handoff and room focus return across the shell', async () => {
    const user = userEvent.setup()
    const selectedFurniture = createSelectedFurniture()
    const registerExclusionElement = vi.fn(() => vi.fn())

    sceneStateActions.setHistory(createHistoryState([selectedFurniture]))
    sceneStateActions.setSelectedId(selectedFurniture.id)
    sceneStateActions.setFloorFinishId('wood-floor')
    sceneStateActions.setWallFinishId('light-gray')

    function TestHarness() {
      const selectedItemControlsRef = React.useRef<HTMLDivElement | null>(null)
      const dockedInspectorRef = React.useRef<HTMLDivElement | null>(null)
      const roomViewRef = React.useRef<HTMLElement | null>(null)
      const onUpdate = vi.fn(() => ({
        ok: true as const,
        item: selectedFurniture,
      }))
      const onInvalid = (fieldLabel: string) =>
        `${fieldLabel} must be a valid number.`
      const placementValue = React.useMemo(
        () => ({
          placement: {
            site: 'docked' as const,
            reason: 'mobile-layout' as const,
            left: 0,
            top: 0,
          },
          actionsSizeRef: () => undefined,
        }),
        [],
      )

      return (
        <TooltipProvider>
          <EditorRefsProvider
            value={{ roomViewRef, selectedItemControlsRef, dockedInspectorRef }}
          >
            <OverlayLayoutProvider
              value={{
                exclusionRects: {},
                registerExclusionElement,
                syncLayoutMode: dialogActions.syncLayoutMode,
              }}
            >
              <SelectedItemInteractionProvider>
                <SelectedItemPlacementProvider value={placementValue}>
                  <div className="relative min-h-192">
                    <FloatingSelectedItemSite
                      onOpenDeleteDialog={vi.fn()}
                      onRotateSelection={vi.fn()}
                    />

                    <EditorOverlay
                      startOverDisabled={false}
                      onHeaderLayoutModeChange={vi.fn()}
                      topHeader={{
                        catalog: [],
                        environmentConfig: {
                          defaultFloorFinishId: 'wood-floor',
                          defaultWallFinishId: 'light-gray',
                          floorFinishes: [
                            {
                              id: 'wood-floor',
                              label: 'Wood',
                              diffusePath: '/textures/wood.jpg',
                              normalPath: '/textures/wood-normal.png',
                              tileSizeMeters: { width: 0.5, depth: 0.5 },
                            },
                          ],
                          wallFinishes: [
                            {
                              id: 'light-gray',
                              label: 'Light Gray',
                              color: 0xf5f5f5,
                            },
                          ],
                        },
                        catalogIdToAdd: '',
                        onAddFurniture: vi.fn(() => true),
                        onCatalogIdToAddChange: vi.fn(),
                        onCatalogDrawerOpenChange: vi.fn(),
                        onUndo: vi.fn(),
                        onRedo: vi.fn(),
                        onShareSceneUrl: vi.fn(() =>
                          Promise.resolve<'shared' | 'copied' | null>('copied'),
                        ),
                        onOpenStartOverDialog: vi.fn(),
                        onConfirmStartOver: vi.fn(),
                      }}
                      outliner={{
                        onSelectById: vi.fn(),
                        onPreviewChange: vi.fn(),
                      }}
                      cameraTools={{
                        onSetCameraPreset: vi.fn(),
                        onFocusSelected: vi.fn(),
                      }}
                      dockedSelectedItem={{
                        onOpenDeleteDialog: vi.fn(),
                        onRotateSelection: vi.fn(),
                        onInvalidSelectedItemDetailValue: onInvalid,
                        onUpdateSelectedItemDetails: onUpdate,
                      }}
                      onConfirmDeleteSelection={vi.fn()}
                      onRetryAssetLoading={vi.fn()}
                    />
                  </div>
                </SelectedItemPlacementProvider>
              </SelectedItemInteractionProvider>
            </OverlayLayoutProvider>
          </EditorRefsProvider>
        </TooltipProvider>
      )
    }

    render(<TestHarness />)

    const outlinerItem = screen.getByRole('button', {
      name: /Leather Armchair/i,
    })
    const rotateCounterclockwiseButton = screen.getByRole('button', {
      name: 'Rotate counterclockwise',
    })

    outlinerItem.focus()
    expect(outlinerItem).toHaveFocus()

    await user.tab()

    expect(rotateCounterclockwiseButton).toHaveFocus()

    await user.tab()
    expect(
      screen.getByRole('button', { name: 'Rotate clockwise' }),
    ).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Remove item' })).toHaveFocus()

    await user.tab()

    expect(screen.getByLabelText('Distance from left wall (m)')).toHaveFocus()

    const environmentTrigger = screen.getByRole('button', { name: 'Room' })

    await user.click(environmentTrigger)

    const environmentDialog = screen.getByRole('complementary', {
      name: 'Room',
    })
    expect(environmentDialog).toBeVisible()

    expect(screen.getByRole('group', { name: 'Camera' })).toBeVisible()
    expect(document.querySelector('[data-camera-anchor]')).toHaveClass(
      'right-94',
    )

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

    expect(environmentTrigger).toHaveFocus()
    expect(document.querySelector('[data-camera-anchor]')).toHaveClass(
      'right-2',
    )
  })
})
