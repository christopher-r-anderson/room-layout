// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { OverlayLayoutProvider } from '@/shared/layout/overlay-layout-provider'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import { resetDialogStore } from '@/editor-state/dialog-store'
import {
  sceneStateActions,
  resetSceneStateStore,
} from '@/editor-state/scene-state-store'
import { DockedSelectedItemSite } from './docked-selected-item-site'
import { FloatingSelectedItemSite } from './floating-selected-item-site'
import { SelectedItemInteractionProvider } from './selected-item-interaction-provider'
import { SelectedItemPlacementProvider } from './selected-item-placement-provider'
import { FURNITURE_ITEM } from './test-fixtures'

beforeEach(() => {
  resetDialogStore()
  resetEditorRuntimeStore()
  resetSceneStateStore()
  editorRuntimeActions.markAssetsReady()
  sceneStateActions.setHistory(createHistoryState([FURNITURE_ITEM]))
  sceneStateActions.setSelectedId(FURNITURE_ITEM.id)
})

describe('DockedSelectedItemSite', () => {
  it('attaches the controls ref when hidden placement still shows details', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const dockedInspectorRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, selectedItemControlsRef, dockedInspectorRef }}
        >
          <OverlayLayoutProvider
            value={{
              exclusionRects: {},
              registerExclusionElement,
              syncLayoutMode: vi.fn(),
            }}
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
                <DockedSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                  onInvalidSelectedItemDetailValue={(fieldLabel) =>
                    `${fieldLabel} must be a valid number.`
                  }
                  onUpdateSelectedItemDetails={() => ({
                    ok: true,
                    item: FURNITURE_ITEM,
                  })}
                />
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayLayoutProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Selected item actions' }),
    ).not.toBeInTheDocument()
    expect(selectedItemControlsRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
    expect(selectedItemControlsRef.current).toContainElement(
      screen.getByRole('button', { name: 'Rotate counterclockwise' }),
    )
    expect(dockedInspectorRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })

  it('keeps controls ref on docked inspector when floating supplemental actions also render', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const dockedInspectorRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, selectedItemControlsRef, dockedInspectorRef }}
        >
          <OverlayLayoutProvider
            value={{
              exclusionRects: {},
              registerExclusionElement,
              syncLayoutMode: vi.fn(),
            }}
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
                <FloatingSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                />
                <DockedSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                  onInvalidSelectedItemDetailValue={(fieldLabel) =>
                    `${fieldLabel} must be a valid number.`
                  }
                  onUpdateSelectedItemDetails={() => ({
                    ok: true,
                    item: FURNITURE_ITEM,
                  })}
                />
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayLayoutProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('region', { name: /Placement$/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('region', { name: 'Selected item actions' }),
    ).toHaveLength(1)
    expect(selectedItemControlsRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
    expect(dockedInspectorRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })

  it('does not render floating supplemental actions in mobile docked layout', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const dockedInspectorRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider
          value={{ roomViewRef, selectedItemControlsRef, dockedInspectorRef }}
        >
          <OverlayLayoutProvider
            value={{
              exclusionRects: {},
              registerExclusionElement,
              syncLayoutMode: vi.fn(),
            }}
          >
            <SelectedItemInteractionProvider>
              <SelectedItemPlacementProvider
                value={{
                  placement: {
                    site: 'docked',
                    reason: 'mobile-layout',
                    left: 12,
                    top: 24,
                  },
                  actionsSizeRef: vi.fn(),
                }}
              >
                <FloatingSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                />
                <DockedSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                  onInvalidSelectedItemDetailValue={(fieldLabel) =>
                    `${fieldLabel} must be a valid number.`
                  }
                  onUpdateSelectedItemDetails={() => ({
                    ok: true,
                    item: FURNITURE_ITEM,
                  })}
                />
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayLayoutProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.queryAllByRole('region', { name: 'Selected item actions' }),
    ).toHaveLength(0)
    expect(selectedItemControlsRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })
})
