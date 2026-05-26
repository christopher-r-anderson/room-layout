// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SelectedItemControls } from '../selection/selected-item-controls'
import { EditorOverlay } from './editor-overlay'

vi.mock('@/components/ui/select', () => {
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
    triggerButton: React.ReactNode
  }) => <>{triggerButton}</>,
}))

vi.mock('../keyboard/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsHelp: () => (
    <button type="button" aria-label="Keyboard shortcuts">
      Keyboard shortcuts
    </button>
  ),
}))

vi.mock('./copy-scene-url-button', () => ({
  CopySceneUrlButton: ({
    disabled,
    onCopySceneUrl,
  }: {
    disabled: boolean
    onCopySceneUrl: () => Promise<boolean>
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void onCopySceneUrl()
      }}
    >
      Copy Scene URL
    </button>
  ),
}))

vi.mock('./new-scene-button', () => ({
  NewSceneButton: ({
    disabled,
    onOpenNewSceneDialog,
  }: {
    disabled: boolean
    onOpenNewSceneDialog: () => void
  }) => (
    <button type="button" disabled={disabled} onClick={onOpenNewSceneDialog}>
      New Scene
    </button>
  ),
}))

vi.mock('../camera/camera-tools', () => ({
  CameraTools: ({
    hasSelection,
    onFocusSelected,
  }: {
    hasSelection: boolean
    onFocusSelected: () => void
  }) => (
    <div role="group" aria-label="Camera">
      <button type="button" disabled={!hasSelection} onClick={onFocusSelected}>
        Focus Selected
      </button>
    </div>
  ),
}))

vi.mock('../selection/delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: () => null,
}))

vi.mock('../selection/new-scene-confirmation-dialog', () => ({
  NewSceneConfirmationDialog: () => null,
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

function createReadModel(item: FurnitureItem): SceneReadModel {
  return {
    selectedId: item.id,
    items: [item],
  }
}

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
  return [
    {
      id: 'light-gray',
      label: 'Light Gray',
      color: 0xf5f5f5,
    },
  ]
}

describe('EditorOverlay integration', () => {
  it('wires outliner reverse-tab handoff and environment focus return across the shell', async () => {
    const user = userEvent.setup()
    const selectedFurniture = createSelectedFurniture()
    const readModel = createReadModel(selectedFurniture)

    function TestHarness() {
      const [isEnvironmentDialogOpen, setIsEnvironmentDialogOpen] =
        React.useState(false)
      const selectedItemControlsRef = React.useRef<HTMLDivElement | null>(null)

      return (
        <TooltipProvider>
          <div className="relative min-h-192">
            <SelectedItemControls
              containerRef={selectedItemControlsRef}
              editorInteractionsEnabled={true}
              isCatalogDrawerOpen={false}
              onInvalidSelectedItemDetailValue={(fieldLabel) =>
                `${fieldLabel} must be a valid number.`
              }
              onOpenDeleteDialog={vi.fn()}
              onRotateSelection={vi.fn()}
              onUpdateSelectedItemDetails={vi.fn(() => ({
                ok: true as const,
                item: selectedFurniture,
              }))}
              selectedFurniture={selectedFurniture}
              startupOverlayActive={false}
            />

            <EditorOverlay
              editorInteractionsEnabled={true}
              newSceneDisabled={false}
              statusMessage={null}
              onCopySceneUrl={vi.fn(() => Promise.resolve(true))}
              camera={{
                onSetCameraPreset: vi.fn(),
                onFocusSelected: vi.fn(),
              }}
              startup={{
                assetError: false,
                assetErrorKind: null,
                assetErrorMessage: null,
                startupLoadingActive: false,
                startupOverlayActive: false,
                onRetryAssetLoading: vi.fn(),
              }}
              history={{
                historyAvailability: { canUndo: false, canRedo: false },
                onUndo: vi.fn(),
                onRedo: vi.fn(),
              }}
              scene={{
                focusRequest: null,
                onFocusHandled: vi.fn(),
                onNavigateBackToSelectionControls: () => {
                  const firstFocusableControl =
                    selectedItemControlsRef.current?.querySelector<HTMLElement>(
                      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                    )

                  if (!firstFocusableControl) {
                    return false
                  }

                  firstFocusableControl.focus()
                  return true
                },
                onSelectById: vi.fn(),
                readModel,
                sceneInteractionsDisabled: false,
              }}
              catalog={{
                catalog: [],
                catalogIdToAdd: '',
                isCatalogDrawerOpen: false,
                onAddFurniture: vi.fn(() => true),
                onCatalogIdToAddChange: vi.fn(),
                onCatalogDrawerOpenChange: vi.fn(),
              }}
              dialogs={{
                isDeleteDialogOpen: false,
                pendingDeleteFurniture: null,
                onCloseDeleteDialog: vi.fn(),
                onConfirmDeleteSelection: vi.fn(),
                isEnvironmentDialogOpen,
                onEnvironmentDialogOpenChange: setIsEnvironmentDialogOpen,
                isNewSceneDialogOpen: false,
                onCloseNewSceneDialog: vi.fn(),
                onOpenNewSceneDialog: vi.fn(),
                onConfirmNewScene: vi.fn(),
                isInfoDialogOpen: false,
                onInfoDialogOpenChange: vi.fn(),
              }}
              preview={{
                previewedId: null,
                onPreviewChange: vi.fn(),
              }}
              floorFinishId="wood-floor"
              floorFinishLoading={false}
              floorFinishes={createFloorOptions()}
              onFloorFinishChange={vi.fn()}
              wallFinishId="light-gray"
              wallFinishes={createWallOptions()}
              onWallFinishChange={vi.fn()}
            />
          </div>
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

    await user.keyboard('{Shift>}{Tab}{/Shift}')

    expect(rotateCounterclockwiseButton).toHaveFocus()

    const environmentTrigger = screen.getByRole('button', {
      name: 'Environment',
    })

    await user.click(environmentTrigger)

    const environmentDialog = screen.getByRole('dialog', {
      name: 'Environment',
    })
    expect(environmentDialog).toBeVisible()

    await user.click(
      within(environmentDialog).getAllByRole('button', { name: 'Close' })[0],
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Environment' }),
      ).not.toBeInTheDocument()
    })

    expect(environmentTrigger).toHaveFocus()
  })
})
